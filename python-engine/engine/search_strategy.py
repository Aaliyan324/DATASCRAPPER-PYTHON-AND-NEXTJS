from __future__ import annotations

import logging

from ai.schemas import SearchPlan

logger = logging.getLogger(__name__)

CATEGORY_SYNONYMS = {
    "school": ["schools", "private schools"],
    "college": ["colleges", "private colleges"],
    "university": ["universities"],
    "hotel": ["hotels"],
    "hospital": ["hospitals"],
    "restaurant": ["restaurants"],
    "cafe": ["cafes", "coffee shops"],
    "pharmacy": ["pharmacies", "medical stores"],
    "shop": ["shops", "stores"],
    "business": ["businesses"],
    "gym": ["gyms", "fitness centers"],
    "salon": ["salons", "beauty parlors"],
    "clinic": ["clinics", "medical clinics"],
    "dentist": ["dentists", "dental clinics"],
    "doctor": ["doctors", "physicians"],
    "bank": ["banks"],
    "supermarket": ["supermarkets", "grocery stores"],
    "bakery": ["bakeries"],
    "mosque": ["mosques", "masjids"],
}


def _build_specific_location_string(plan: SearchPlan) -> str:
    """Build the most specific location string for search queries."""
    loc = plan.location
    parts: list[str] = []

    # Most specific → least specific, but limit to avoid over-long queries.
    seen: set[str] = set()
    for val in (
        loc.block, loc.phase, loc.sector,
        loc.chowk, loc.market, loc.bazaar, loc.road,
        loc.landmark, loc.basti, loc.mouza, loc.village,
        loc.colony, loc.neighborhood, loc.locality,
        loc.housing_society, loc.town, loc.city,
        loc.tehsil, loc.district,
    ):
        if val and val.lower() not in seen:
            seen.add(val.lower())
            parts.append(val)
            if len(parts) >= 3:
                break

    if not parts:
        return plan.location.display_name()

    return ", ".join(parts) + ", Pakistan"


def build_search_queries(plan: SearchPlan) -> list[str]:
    """Build search queries with location bias for Google Places.

    Strategy:
    1. Primary: most specific location name.
    2. Variants with parent city for disambiguation.
    3. Category synonym variants.
    """
    loc = plan.location
    category = plan.category.strip()
    terms = CATEGORY_SYNONYMS.get(category.lower(), [category])
    queries: list[str] = []

    ownership = plan.filters.get("ownership")
    if ownership:
        terms = [f"{ownership} {t}" for t in terms]

    specific_loc = _build_specific_location_string(plan)

    # 1. Primary queries — specific location + category.
    for term in terms[:2]:
        queries.append(f"{term} in {specific_loc}")

    # 2. If we have hyperlocal components, add a query with the parent city.
    if loc.housing_society and loc.city and loc.housing_society.lower() != loc.city.lower():
        queries.append(f"{category} in {loc.housing_society}, {loc.city}, Pakistan")
    if loc.village or loc.mouza or loc.basti:
        rural = loc.village or loc.mouza or loc.basti
        parent = loc.tehsil or loc.city or loc.district
        if parent:
            queries.append(f"{category} near {rural}, {parent}, Pakistan")
    if loc.chowk or loc.road or loc.landmark:
        micro = loc.chowk or loc.road or loc.landmark
        parent = loc.city or loc.district
        if parent:
            queries.append(f"{category} near {micro}, {parent}, Pakistan")

    # 3. Broader fallback: city or district level (for coverage).
    if loc.city:
        queries.append(f"{category} in {loc.city}, Pakistan")
    elif loc.district:
        province = loc.province or "Pakistan"
        queries.append(f"{category} in {loc.district}, {province}, Pakistan")

    # 4. Sector/block-specific query for Islamabad-style locations.
    if loc.sector and loc.city:
        sector_query = loc.block or loc.sector  # e.g. F-7/2 or F-7
        queries.append(f"{category} in {sector_query} {loc.city}, Pakistan")

    # Deduplicate and cap.
    seen = set()
    unique = [q for q in queries if not (q.lower() in seen or seen.add(q.lower()))]
    max_queries = 4
    result = unique[:max_queries]

    logger.debug("Search queries: %s", result)
    return result
