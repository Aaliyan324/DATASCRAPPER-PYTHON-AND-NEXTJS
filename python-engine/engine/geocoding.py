"""Google Geocoding integration for Pakistan hyperlocal resolution.

Resolves Location objects to lat/lng coordinates and enriches them with
administrative components returned by the Geocoding API.  Uses the New
Places API endpoint (places.googleapis.com) for consistency with the
rest of the engine.
"""

from __future__ import annotations

import logging
import math

import requests

from ai.schemas import Location
from config import settings

logger = logging.getLogger(__name__)

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

# ---------------------------------------------------------------------------
# Cache (process-level, simple dict)
# ---------------------------------------------------------------------------
_geocode_cache: dict[str, dict] = {}


def _build_geocode_query(loc: Location) -> str:
    """Build the most specific geocoding query string from a Location."""
    # Start from the most specific component and work up.
    specific_parts: list[str] = []
    for val in (
        loc.block, loc.phase, loc.sector,
        loc.chowk, loc.market, loc.bazaar, loc.road,
        loc.landmark, loc.basti, loc.mouza, loc.village,
        loc.colony, loc.neighborhood, loc.locality,
        loc.housing_society, loc.town, loc.city,
        loc.tehsil, loc.district,
    ):
        if val:
            specific_parts.append(val)

    if not specific_parts:
        return ""

    # Use at most 4 components to keep the query focused.
    query = ", ".join(specific_parts[:4]) + ", Pakistan"
    return query


def geocode_location(loc: Location) -> Location:
    """Resolve a Location to coordinates via Google Geocoding.

    Returns a *new* Location with latitude/longitude filled in and, where
    possible, administrative hierarchy fields enriched from the API response.
    If the geocoding call fails or returns no results, the original Location
    is returned unchanged with a lower confidence score.
    """
    if loc.has_coordinates():
        return loc  # already resolved

    query = _build_geocode_query(loc)
    if not query:
        logger.debug("Geocode: no query components for location %s", loc)
        return loc.model_copy(update={"confidence": max(loc.confidence - 0.2, 0.0)})

    # Check cache
    cache_key = query.lower()
    if cache_key in _geocode_cache:
        cached = _geocode_cache[cache_key]
        return _apply_geocode_result(loc, cached)

    try:
        response = requests.get(
            GEOCODE_URL,
            params={
                "address": query,
                "key": settings.google_maps_api_key,
                "region": "pk",
                "language": "en",
            },
            timeout=settings.request_timeout,
        )

        if response.status_code != 200:
            logger.warning("Geocode API returned %d for %r", response.status_code, query)
            return loc.model_copy(update={"confidence": max(loc.confidence - 0.3, 0.0)})

        data = response.json()
        results = data.get("results", [])

        if not results:
            logger.debug("Geocode: no results for %r", query)
            return loc.model_copy(update={
                "confidence": max(loc.confidence - 0.3, 0.0),
                "confidence_note": f"No geocode results for: {query}",
            })

        # Use the first (best) result.
        best = results[0]
        _geocode_cache[cache_key] = best

        return _apply_geocode_result(loc, best)

    except Exception as exc:
        logger.warning("Geocode failed for %r: %s", query, exc)
        return loc.model_copy(update={"confidence": max(loc.confidence - 0.3, 0.0)})


def _apply_geocode_result(loc: Location, result: dict) -> Location:
    """Merge a Geocoding API result into a Location."""
    geometry = result.get("geometry", {})
    location_data = geometry.get("location", {})
    lat = location_data.get("lat")
    lng = location_data.get("lng")

    # Extract administrative components.
    updates: dict = {}
    if lat is not None and lng is not None:
        updates["latitude"] = lat
        updates["longitude"] = lng

    address_components = result.get("address_components", [])
    ac_map = {}
    for comp in address_components:
        for t in comp.get("types", []):
            ac_map[t] = comp.get("long_name", "")

    # Only fill fields that are currently None.
    if not loc.province and "administrative_area_level_1" in ac_map:
        updates["province"] = ac_map["administrative_area_level_1"]
    if not loc.district and "administrative_area_level_2" in ac_map:
        updates["district"] = ac_map["administrative_area_level_2"]
    if not loc.tehsil and "administrative_area_level_3" in ac_map:
        updates["tehsil"] = ac_map["administrative_area_level_3"]
    if not loc.city and "locality" in ac_map:
        updates["city"] = ac_map["locality"]
    if not loc.locality and "sublocality" in ac_map:
        updates["locality"] = ac_map["sublocality"]
    if not loc.locality and "sublocality_level_1" in ac_map:
        updates["locality"] = ac_map["sublocality_level_1"]

    # Geocoding succeeded → boost confidence.
    updates["confidence"] = min(loc.confidence + 0.1, 1.0)
    updates["confident"] = True

    # Determine viewport radius if available.
    viewport = geometry.get("viewport")
    if viewport and "northeast" in viewport and "southwest" in viewport:
        ne = viewport["northeast"]
        sw = viewport["southwest"]
        radius = _haversine_km(
            (ne["lat"] + sw["lat"]) / 2,
            (ne["lng"] + sw["lng"]) / 2,
            ne["lat"], ne["lng"],
        ) * 1000  # convert km → meters
        if radius > 100 and not loc.radius_meters:
            updates["radius_meters"] = int(radius)

    return loc.model_copy(update=updates)


# ---------------------------------------------------------------------------
# Distance calculation (Haversine)
# ---------------------------------------------------------------------------

_EARTH_RADIUS_KM = 6371.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two points."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Public wrapper for distance calculations."""
    return _haversine_km(lat1, lon1, lat2, lon2)
