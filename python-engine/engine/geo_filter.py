"""Geographic validation, scoring, and ranking of Google Places results.

After Google Places returns results, this module:

1. Calculates the distance from each result to the requested location.
2. Assigns a *location_match_score* (0-1) based on proximity.
3. Filters out results that are clearly outside the requested area.
4. Ranks results so that geographically accurate results appear first.
"""

from __future__ import annotations

import logging
from typing import Optional

from ai.schemas import Location, SearchPlan, SearchPreposition
from engine.geocoding import haversine_km
from models.place import PlaceRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Distance / scoring
# ---------------------------------------------------------------------------


def _result_lat_lng(record: PlaceRecord) -> Optional[tuple[float, float]]:
    if record.latitude is not None and record.longitude is not None:
        return (record.latitude, record.longitude)
    return None


def _compute_distance_km(record: PlaceRecord, loc: Location) -> Optional[float]:
    """Distance in km between a PlaceRecord and the requested Location."""
    if not loc.has_coordinates():
        return None
    rll = _result_lat_lng(record)
    if not rll:
        return None
    return haversine_km(loc.latitude, loc.longitude, rll[0], rll[1])


def _address_similarity_score(record: PlaceRecord, loc: Location) -> float:
    """Simple text-based overlap score between the result address and the
    requested location.  Used as a fallback when coordinates are missing.

    Returns a value between 0 and 1.
    """
    if not record.address:
        return 0.0

    addr_lower = record.address.lower()

    # Collect all non-trivial location tokens from the Location model.
    tokens: list[str] = []
    for val in (
        loc.block, loc.phase, loc.sector,
        loc.chowk, loc.market, loc.bazaar, loc.road,
        loc.landmark, loc.basti, loc.mouza, loc.village,
        loc.colony, loc.neighborhood, loc.locality,
        loc.housing_society, loc.town, loc.city,
        loc.tehsil, loc.district,
    ):
        if val:
            tokens.append(val.lower())

    if not tokens:
        return 0.0

    hits = sum(1 for t in tokens if t in addr_lower)
    return hits / len(tokens)


def score_result(record: PlaceRecord, plan: SearchPlan) -> float:
    """Compute a location_match_score (0-1) for a result given the plan.

    Higher means the result is more likely inside the requested area.
    """
    loc = plan.location
    dist = _compute_distance_km(record, loc)

    if dist is not None:
        radius_km = loc.effective_radius() / 1000.0
        if dist <= radius_km:
            # Inside the desired radius → high score, scaled by proximity.
            return max(0.5, 1.0 - (dist / (radius_km * 2)))
        else:
            # Outside but may still be relevant for "near" queries.
            overshoot = dist - radius_km
            return max(0.0, 0.5 - (overshoot / (radius_km * 4)))

    # Fallback: text-based matching when no coordinates.
    return _address_similarity_score(record, loc) * 0.6


def filter_and_rank(
    records: list[PlaceRecord],
    plan: SearchPlan,
) -> list[PlaceRecord]:
    """Score, filter, and rank results by geographic relevance.

    Steps:
    1. Compute distance_km and location_match_score for each record.
    2. Reject results that are clearly outside the requested geography.
    3. Sort by location_match_score descending (most relevant first).
    """
    loc = plan.location
    radius_km = loc.effective_radius() / 1000.0

    # Preposition determines filtering strictness.
    max_allowed_km: float
    if plan.location.preposition == SearchPreposition.INSIDE:
        max_allowed_km = radius_km * 1.2
    elif plan.location.preposition == SearchPreposition.IN:
        max_allowed_km = radius_km * 2.0
    elif plan.location.preposition == SearchPreposition.NEAR:
        max_allowed_km = radius_km * 4.0
    else:  # AROUND
        max_allowed_km = radius_km * 3.0

    enriched: list[PlaceRecord] = []
    rejected: int = 0

    for r in records:
        dist = _compute_distance_km(r, loc)
        score = score_result(r, plan)

        updates = {"location_match_score": round(score, 3)}
        if dist is not None:
            updates["distance_km"] = round(dist, 3)

        updated = r.model_copy(update=updates)

        # Filter: reject results too far from the target.
        if dist is not None and dist > max_allowed_km:
            # However, if no results pass the filter we keep the closest ones.
            # This is a soft filter — we still append but will sort lower.
            rejected += 1

        enriched.append(updated)

    # Sort: primary by score (desc), secondary by distance (asc).
    enriched.sort(
        key=lambda r: (
            -(r.location_match_score or 0),
            (r.distance_km or 9999),
        ),
    )

    # If more than half the results were rejected AND we have enough kept
    # results, trim the rejected ones.
    kept = [r for r in enriched if (r.distance_km or 0) <= max_allowed_km]
    if len(kept) >= 5:
        enriched = kept
    elif len(kept) > 0:
        enriched = kept

    logger.info(
        "GeoFilter: %d kept, %d rejected (radius=%.1f km, preposition=%s)",
        len(enriched), rejected, radius_km, loc.preposition.value,
    )

    return enriched
