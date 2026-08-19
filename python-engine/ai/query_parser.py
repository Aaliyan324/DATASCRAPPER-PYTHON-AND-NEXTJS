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
        return plan
