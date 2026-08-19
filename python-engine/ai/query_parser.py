from ai.gemini_client import GeminiClient
from ai.schemas import SearchPlan
from pakistan.location_resolver import PakistanLocationResolver
from pakistan.roman_urdu import normalize_query


class QueryParser:
    def __init__(self):
        self.gemini = GeminiClient()
        self.location_resolver = PakistanLocationResolver()

    def parse(self, query: str) -> SearchPlan:
        normalized = normalize_query(query)
        plan = self.gemini.parse(normalized)
        plan.original_query = query

        resolved = self.location_resolver.resolve(plan.location)
        if resolved is not None:
            plan.location = resolved

        # Lightweight deterministic export/count detection is a safety net.
        q = query.lower()
        if plan.export_format is None:
            if "excel" in q or "xlsx" in q:
                plan.export_format = "excel"
            elif "pdf" in q or "report" in q:
                plan.export_format = "pdf"

        # Build debug info snapshot.
        loc = plan.location
        plan.debug_info = {
            "original_query": query,
            "normalized_query": normalized,
            "location": {
                "name": loc.most_specific_name(),
                "display": loc.display_name(),
                "type": loc.location_type,
                "province": loc.province,
                "division": loc.division,
                "district": loc.district,
                "tehsil": loc.tehsil,
                "city": loc.city,
                "town": loc.town,
                "housing_society": loc.housing_society,
                "phase": loc.phase,
                "sector": loc.sector,
                "block": loc.block,
                "village": loc.village,
                "mouza": loc.mouza,
                "basti": loc.basti,
                "locality": loc.locality,
                "neighborhood": loc.neighborhood,
                "colony": loc.colony,
                "market": loc.market,
                "bazaar": loc.bazaar,
                "chowk": loc.chowk,
                "road": loc.road,
                "landmark": loc.landmark,
                "coordinates": (
                    {"lat": loc.latitude, "lng": loc.longitude}
                    if loc.has_coordinates() else None
                ),
                "confidence": loc.confidence,
                "confident": loc.confident,
                "preposition": loc.preposition.value,
                "distance_meters": loc.distance_meters,
                "search_radius_m": loc.effective_radius(),
            },
            "category": plan.category,
            "filters": plan.filters,
        }

        return plan
