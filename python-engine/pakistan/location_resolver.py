from __future__ import annotations

import logging
from typing import Optional

from ai.schemas import Location
from pakistan.locations import (
    LOCATION_ALIASES,
    PAKISTAN_LOCATIONS,
    PAKISTAN_SOCIETIES,
    PAKISTAN_TEHSILS,
)

logger = logging.getLogger(__name__)


class PakistanLocationResolver:
    """Enriches a Location parsed by Gemini with known Pakistani administrative
    data and resolves unknown locations via the Google Geocoding API.
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def resolve(self, location: Location) -> Location:
        """Enrich the Location with known hierarchy data, then geocode."""
        enriched = self._enrich_from_knowledge(location)
        # Geocode to get coordinates (lazy import to avoid circular deps).
        try:
            from engine.geocoding import geocode_location
            enriched = geocode_location(enriched)
        except Exception as exc:
            logger.warning("Geocoding failed in resolver: %s", exc)
        return enriched

    # ------------------------------------------------------------------
    # Knowledge-layer enrichment
    # ------------------------------------------------------------------

    def _enrich_from_knowledge(self, loc: Location) -> Location:
        """Fill in province/district/tehsil from the static knowledge layer."""
        # Gather candidate names from the most to least specific fields.
        candidates = [
            ("housing_society", loc.housing_society),
            ("bazaar", loc.bazaar),
            ("market", loc.market),
            ("chowk", loc.chowk),
            ("road", loc.road),
            ("landmark", loc.landmark),
            ("block", loc.block),
            ("phase", loc.phase),
            ("sector", loc.sector),
            ("basti", loc.basti),
            ("mouza", loc.mouza),
            ("village", loc.village),
            ("colony", loc.colony),
            ("neighborhood", loc.neighborhood),
            ("locality", loc.locality),
            ("town", loc.town),
            ("city", loc.city),
            ("tehsil", loc.tehsil),
            ("district", loc.district),
        ]

        updates: dict = {}

        # 1. Try city/tehsil against PAKISTAN_LOCATIONS.
        for _, name in candidates:
            if not name:
                continue
            key = self._match(name, PAKISTAN_LOCATIONS)
            if key:
                data = PAKISTAN_LOCATIONS[key]
                if not loc.province:
                    updates.setdefault("province", data.get("province"))
                if not loc.district:
                    updates.setdefault("district", data.get("district"))
                if not loc.city and data.get("city"):
                    updates.setdefault("city", data["city"])
                if not loc.tehsil and data.get("tehsil"):
                    updates.setdefault("tehsil", data["tehsil"])
                break

        # 2. Try tehsils registry.
        for _, name in candidates:
            if not name:
                continue
            key = self._match(name, PAKISTAN_TEHSILS)
            if key:
                data = PAKISTAN_TEHSILS[key]
                if not loc.province:
                    updates.setdefault("province", data.get("province"))
                if not loc.district:
                    updates.setdefault("district", data.get("district"))
                if not loc.tehsil and data.get("tehsil"):
                    updates.setdefault("tehsil", data["tehsil"])
                if not loc.city and data.get("city"):
                    updates.setdefault("city", data["city"])
                # If this was matched as a tehsil but not yet as the city,
                # set it as the town.
                if not loc.town and key not in PAKISTAN_LOCATIONS:
                    updates.setdefault("town", key)
                break

        # 3. Mark housing societies.
        if loc.housing_society:
            key = self._match(loc.housing_society, PAKISTAN_SOCIETIES)
            if key and not loc.location_type:
                updates["location_type"] = "housing_society"

        # 4. Infer location_type if not set.
        if not updates.get("location_type") and not loc.location_type:
            ltype = self._infer_location_type(loc)
            if ltype:
                updates["location_type"] = ltype

        # 5. Apply aliases for common misspellings.
        if loc.city:
            canonical = LOCATION_ALIASES.get(loc.city.lower())
            if canonical and canonical != loc.city:
                updates["city"] = canonical

        if updates:
            return loc.model_copy(update=updates)
        return loc

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _match(value: str, registry: dict) -> Optional[str]:
        """Case-insensitive match against a registry key."""
        v = " ".join(value.lower().split())
        for name in registry:
            if " ".join(name.lower().split()) == v:
                return name
        return None

    @staticmethod
    def _infer_location_type(loc: Location) -> Optional[str]:
        """Infer the most specific location_type from populated fields."""
        if loc.block:
            return "block"
        if loc.phase:
            return "phase"
        if loc.sector:
            return "sector"
        if loc.chowk:
            return "chowk"
        if loc.market or loc.bazaar:
            return "market"
        if loc.road:
            return "road"
        if loc.landmark:
            return "landmark"
        if loc.basti:
            return "basti"
        if loc.mouza:
            return "mouza"
        if loc.village:
            return "village"
        if loc.colony:
            return "colony"
        if loc.neighborhood:
            return "neighborhood"
        if loc.locality:
            return "locality"
        if loc.housing_society:
            return "housing_society"
        if loc.town:
            return "town"
        if loc.union_council:
            return "union_council"
        if loc.city:
            return "city"
        if loc.tehsil:
            return "tehsil"
        if loc.district:
            return "district"
        if loc.division:
            return "division"
        if loc.province:
            return "province"
        return None
