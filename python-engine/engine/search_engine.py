from __future__ import annotations

from ai.schemas import SearchPlan
from engine.search_strategy import build_search_queries
from engine.normalizer import normalize_place
from engine.deduplicator import deduplicate
from engine.validator import quality_stats
from sources.google_places import GooglePlacesClient
from models.place import PlaceRecord


class SearchEngine:
    def __init__(self):
        self.client = GooglePlacesClient()

    def search(self, plan: SearchPlan) -> tuple[list[PlaceRecord], dict]:
        queries = build_search_queries(plan)
        raw = []
        for q in queries:
            raw.extend(self.client.text_search(q, plan))

        raw_count = len(raw)
        normalized = [normalize_place(p, plan) for p in raw]
        unique = deduplicate(normalized)

        # Respect requested count after deduplication.
        if plan.requested_result_count:
            unique = unique[:plan.requested_result_count]

        stats = quality_stats(
            raw_results=raw_count,
            unique_records=unique,
            duplicates_removed=raw_count - len(unique),
        )
        return unique, stats
