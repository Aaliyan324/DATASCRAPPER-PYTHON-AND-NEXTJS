"""OpenStreetMap / Overpass API scraping source.

Ported from the existing standalone scraper.py. Uses Nominatim for
geocoding and the Overpass API for querying OSM business data.
"""

from __future__ import annotations
import asyncio
import logging
import re
from typing import Callable, Optional

import httpx

from ..query_models import BusinessRecord, ScrapeRequest
from ..normalizer import clean_text, normalize_url
from .base import BaseSource

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "DataScrapper/2.0 (Python Scraper Service)"}

# Map from our normalized category names to OSM tag key/value pairs
CATEGORY_OSM_MAP: dict[str, tuple[str, str]] = {
    # Food & Drink
    "restaurant": ("amenity", "restaurant"),
    "fast food": ("amenity", "fast_food"),
    "cafe": ("amenity", "cafe"),
    "bakery": ("shop", "bakery"),
    # Accommodation
    "hotel": ("tourism", "hotel"),
    "guest house": ("tourism", "guest_house"),
    # Health
    "hospital": ("amenity", "hospital"),
    "clinic": ("amenity", "clinic"),
    "pharmacy": ("amenity", "pharmacy"),
    "dentist": ("amenity", "dentist"),
    "doctor": ("amenity", "doctors"),
    # Education
    "school": ("amenity", "school"),
    "college": ("amenity", "college"),
    "university": ("amenity", "university"),
    # Finance
    "bank": ("amenity", "bank"),
    # Fitness
    "gym": ("leisure", "fitness_centre"),
    # Retail
    "supermarket": ("shop", "supermarket"),
    "salon": ("shop", "hairdresser"),
    # Professional
    "software house": ("office", "it"),
    "real estate agency": ("office", "estate_agent"),
    # Worship
    "mosque": ("amenity", "mosque"),
    "church": ("amenity", "church"),
    "temple": ("amenity", "temple"),
    # Default fallback
    "business": ("amenity", ""),
}


def _get_osm_tags(category: str) -> tuple[str, str]:
    """Resolve a category name to OSM tag key/value."""
    cat = category.lower().strip()
    if cat in CATEGORY_OSM_MAP:
        return CATEGORY_OSM_MAP[cat]
    # Try singular form
    singular = re.sub(r"s$", "", cat)
    if singular in CATEGORY_OSM_MAP:
        return CATEGORY_OSM_MAP[singular]
    # Fallback: search by name
    return ("name", "")


async def geocode(location: str, client: httpx.AsyncClient) -> tuple[float, float, str]:
    """Geocode a location string via Nominatim.

    Returns (latitude, longitude, display_name).
    """
    # Respect Nominatim rate limit
    await asyncio.sleep(1.1)

    params = {"q": location, "format": "json", "limit": 1, "addressdetails": 1}
    response = await client.get(NOMINATIM_URL, params=params, timeout=30)
    response.raise_for_status()

    results = response.json()
    if not results:
        raise ValueError(f"Location not found: {location}")

    result = results[0]
    lat = float(result["lat"])
    lon = float(result["lon"])
    display = result.get("display_name", location)
    logger.info("Geocoded '%s' -> %s (%.4f, %.4f)", location, display, lat, lon)
    return lat, lon, display


async def query_overpass(
    osm_key: str,
    osm_value: str,
    latitude: float,
    longitude: float,
    radius: int = 10000,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Query Overpass API for businesses near a location."""
    if osm_value:
        query = f"""
        [out:json][timeout:120];
        (
            node["{osm_key}"="{osm_value}"](around:{radius},{latitude},{longitude});
            way["{osm_key}"="{osm_value}"](around:{radius},{latitude},{longitude});
            relation["{osm_key}"="{osm_value}"](around:{radius},{latitude},{longitude});
        );
        out center tags;
        """
    else:
        # When no specific value, search for any node with the key
        query = f"""
        [out:json][timeout:120];
        (
            node["{osm_key}"](around:{radius},{latitude},{longitude});
            way["{osm_key}"](around:{radius},{latitude},{longitude});
        );
        out center tags;
        """

    _client = client or httpx.AsyncClient(headers=HEADERS)
    try:
        response = await _client.post(OVERPASS_URL, data=query, timeout=150)
        response.raise_for_status()
        data = response.json()
        elements = data.get("elements", [])
        logger.info("Overpass returned %d elements", len(elements))
        return elements
    finally:
        if client is None:
            await _client.aclose()


def _build_address(tags: dict) -> str:
    """Build a human-readable address from OSM addr:* tags."""
    fields = [
        "addr:housenumber",
        "addr:street",
        "addr:neighbourhood",
        "addr:suburb",
        "addr:city",
        "addr:postcode",
    ]
    parts = []
    for f in fields:
        val = tags.get(f)
        if val:
            parts.append(clean_text(val))
    return ", ".join(parts)


def _extract_from_element(element: dict, category: str, city: str | None, country: str | None) -> BusinessRecord | None:
    """Extract a BusinessRecord from an OSM element."""
    tags = element.get("tags", {})

    name = tags.get("name") or tags.get("name:en") or tags.get("official_name")
    if not name:
        return None
    name = clean_text(name)

    phone = tags.get("phone") or tags.get("contact:phone") or tags.get("mobile")
    email = tags.get("email") or tags.get("contact:email")
    website = tags.get("website") or tags.get("contact:website") or tags.get("url")

    # Coordinates
    lat = element.get("lat") or element.get("center", {}).get("lat")
    lon = element.get("lon") or element.get("center", {}).get("lon")

    # Rating from OSM stars tag
    rating_str = tags.get("stars")
    rating: float | None = None
    if rating_str:
        try:
            rating = float(rating_str)
        except (ValueError, TypeError):
            pass

    # Opening hours
    opening_hours = tags.get("opening_hours")

    # Source URL: link to OSM element
    element_type = element.get("type", "node")
    element_id = element.get("id")
    source_url = f"https://www.openstreetmap.org/{element_type}/{element_id}" if element_id else None

    # Address
    address = _build_address(tags)
    area = tags.get("addr:suburb") or tags.get("addr:neighbourhood")
    osm_city = tags.get("addr:city") or city
    osm_country = country or "Pakistan"

    # Description from cuisine or description tag
    description = tags.get("description") or tags.get("cuisine")

    return BusinessRecord(
        name=name,
        category=category.title(),
        address=address or None,
        area=clean_text(area) or None,
        city=clean_text(osm_city) or city,
        country=osm_country,
        phone=clean_text(phone) or None,
        email=clean_text(email) or None,
        website=normalize_url(website),
        rating=rating,
        opening_hours=clean_text(opening_hours) or None,
        description=clean_text(description) or None,
        source="OpenStreetMap",
        source_url=source_url,
        latitude=float(lat) if lat else None,
        longitude=float(lon) if lon else None,
    )


class OverpassSource(BaseSource):
    """Scrapes business data from OpenStreetMap via the Overpass API."""

    @property
    def name(self) -> str:
        return "OpenStreetMap / Overpass API"

    async def search(
        self,
        request: ScrapeRequest,
        on_progress: Optional[Callable[[str, int], None]] = None,
    ) -> list[BusinessRecord]:
        location_str = request.location.query or request.location.city or ""
        if not location_str:
            logger.warning("No location provided, cannot search OSM")
            return []

        category = request.category or "business"

        if on_progress:
            on_progress("Geocoding location", 10)

        async with httpx.AsyncClient(headers=HEADERS) as client:
            # 1. Geocode
            try:
                lat, lon, display_name = await geocode(location_str, client)
            except (ValueError, httpx.HTTPError) as e:
                logger.error("Geocoding failed: %s", e)
                return []

            if on_progress:
                on_progress(f"Searching businesses near {display_name}", 30)

            # 2. Query Overpass
            osm_key, osm_value = _get_osm_tags(category)
            try:
                elements = await query_overpass(osm_key, osm_value, lat, lon, client=client)
            except httpx.HTTPError as e:
                logger.error("Overpass query failed: %s", e)
                return []

            if on_progress:
                on_progress(f"Extracting data from {len(elements)} results", 60)

            # 3. Extract records
            records: list[BusinessRecord] = []
            city = request.location.city
            country = request.location.country
            for element in elements:
                try:
                    record = _extract_from_element(element, category, city, country)
                    if record:
                        records.append(record)
                except Exception as e:
                    logger.warning("Failed to extract element: %s", e)

            if on_progress:
                on_progress(f"Extracted {len(records)} businesses", 80)

            # Respect limit
            if request.limit and len(records) > request.limit:
                records = records[: request.limit]

            # Sort: records with phone numbers first
            records.sort(key=lambda r: (not bool(r.phone), r.name.lower()))

            return records
