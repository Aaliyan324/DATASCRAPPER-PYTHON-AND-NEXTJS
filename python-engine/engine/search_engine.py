from __future__ import annotations

import logging

from ai.schemas import SearchPlan
from engine.geo_filter import filter_and_rank
from engine.search_strategy import build_search_queries
from engine.normalizer import normalize_place
from engine.deduplicator import deduplicate
from engine.validator import quality_stats
from sources.google_places import GooglePlacesClient
from models.place import PlaceRecord

logger = logging.getLogger(__name__)


class SearchEngine:
    def __init__(self):
        self.client = GooglePlacesClient()

    def search(self, plan: SearchPlan) -> tuple[list[PlaceRecord], dict]:
        queries = build_search_queries(plan)
        raw = []
        for q in queries:
            logger.info("Searching: %s", q)
            raw.extend(self.client.text_search(q, plan))

        raw_count = len(raw)
        normalized = [normalize_place(p, plan) for p in raw]
        unique = deduplicate(normalized)

        # Geographic filtering and ranking.
        if plan.location.has_coordinates() or plan.location.city:
            unique = filter_and_rank(unique, plan)

        # Respect requested count after deduplication and filtering.
        if plan.requested_result_count:
            unique = unique[:plan.requested_result_count]

        # Build debug info.
        exact_matches = sum(
            1 for r in unique
            if r.location_match_score and r.location_match_score >= 0.7
        )
        nearby_matches = sum(
            1 for r in unique
            if r.location_match_score and 0.3 <= r.location_match_score < 0.7
        )
        rejected_count = raw_count - len(unique)

        debug = {
            "query": plan.original_query,
            "location": {
                "name": plan.location.most_specific_name(),
                "type": plan.location.location_type,
                "province": plan.location.province,
                "district": plan.location.district,
                "city": plan.location.city,
                "coordinates": (
                    {"lat": plan.location.latitude, "lng": plan.location.longitude}
                    if plan.location.has_coordinates() else None
                ),
                "confidence": plan.location.confidence,
                "preposition": plan.location.preposition.value,
                "search_radius_m": plan.location.effective_radius(),
            },
            "search_queries": queries,
            "geographic_filtering": {
                "exact_matches": exact_matches,
                "nearby_matches": nearby_matches,
                "rejected_results": rejected_count - (
                    raw_count - len(unique)
                ) if rejected_count > (raw_count - len(unique)) else 0,
            },
        }
        plan.debug_info = debug

        stats = quality_stats(
            raw_results=raw_count,
            unique_records=unique,
            duplicates_removed=raw_count - len(unique),
        )
        return unique, stats
