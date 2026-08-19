from __future__ import annotations

from ai.schemas import SearchPlan


CATEGORY_SYNONYMS = {
    "school": ["schools", "private schools"],
    "college": ["colleges", "private colleges"],
    "university": ["universities"],
    "hotel": ["hotels"],
    "hospital": ["hospitals"],
    "restaurant": ["restaurants"],
}


def build_search_queries(plan: SearchPlan) -> list[str]:
    loc = plan.location.display_name()
    category = plan.category.strip()
    terms = CATEGORY_SYNONYMS.get(category.lower(), [category])
    queries: list[str] = []

    ownership = plan.filters.get("ownership")
    if ownership:
        terms = [f"{ownership} {t}" for t in terms]

    # Primary query first.
    for term in terms:
        queries.append(f"{term} in {loc}")

    # Small-location coverage variants.
    if plan.location.city:
        city = plan.location.city
        queries.append(f"{category} in {city}, Punjab, Pakistan")
        queries.append(f"{category} near {city}, Pakistan")

    if plan.location.district and plan.location.district != plan.location.city:
        queries.append(
            f"{category} in {plan.location.district}, "
            f"{plan.location.province or 'Pakistan'}, Pakistan"
        )

    # Preserve order and remove duplicates.
    seen = set()
    return [q for q in queries if not (q.lower() in seen or seen.add(q.lower()))][:4]
