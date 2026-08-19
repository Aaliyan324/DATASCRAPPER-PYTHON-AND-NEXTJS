from __future__ import annotations

from enum import Enum
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


FieldName = Literal[
    "business_name", "category", "address", "area", "phone", "website",
    "google_maps_url", "latitude", "longitude", "rating", "review_count",
    "opening_hours", "business_status"
]


class SearchPreposition(str, Enum):
    """How the user relates to the location."""
    IN = "in"
    INSIDE = "inside"
    NEAR = "near"
    AROUND = "around"


class Location(BaseModel):
    """Hyperlocal Pakistan location model.

    Fields map the Pakistani administrative hierarchy from province down
    to street-level landmarks, plus rural location types (chak, mouza,
    basti, etc.) and modern housing-society subdivisions (phase, sector,
    block).  Coordinates are resolved post-parse by the geocoding layer.
    """

    country: str = "Pakistan"
    province: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    city: Optional[str] = None
    town: Optional[str] = None
    union_council: Optional[str] = None
    locality: Optional[str] = None
    neighborhood: Optional[str] = None
    village: Optional[str] = None
    mouza: Optional[str] = None
    colony: Optional[str] = None
    basti: Optional[str] = None
    housing_society: Optional[str] = None
    phase: Optional[str] = None
    sector: Optional[str] = None
    block: Optional[str] = None
    market: Optional[str] = None
    bazaar: Optional[str] = None
    chowk: Optional[str] = None
    road: Optional[str] = None
    landmark: Optional[str] = None

    # Coordinates (populated by geocoding layer after Gemini parse)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = None

    # Classification
    location_type: Optional[str] = None
    confidence: float = 1.0
    confident: bool = True
    confidence_note: Optional[str] = None

    # Search modifiers
    preposition: SearchPreposition = SearchPreposition.IN
    distance_meters: Optional[int] = None

    # ------------------------------------------------------------------
    # Display helpers
    # ------------------------------------------------------------------

    def most_specific_name(self) -> str:
        """Return the most specific geographic entity name."""
        for field in (
            self.block, self.phase, self.sector, self.chowk, self.market,
            self.bazaar, self.road, self.landmark, self.basti, self.mouza,
            self.village, self.colony, self.neighborhood, self.locality,
            self.housing_society, self.town, self.union_council,
            self.city, self.tehsil, self.district, self.division,
            self.province,
        ):
            if field:
                return field
        return self.country

    def display_name(self) -> str:
        """Build a comma-separated display string from most to least specific."""
        parts = [
            self.block, self.phase, self.sector,
            self.chowk, self.market, self.bazaar, self.road,
            self.landmark, self.basti, self.mouza, self.village,
            self.colony, self.neighborhood, self.locality,
            self.housing_society, self.town, self.city,
            self.tehsil, self.district, self.province, self.country,
        ]
        return ", ".join(dict.fromkeys(x for x in parts if x))

    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    def effective_radius(self) -> int:
        """Return an adaptive search radius based on location specificity."""
        if self.distance_meters:
            return self.distance_meters
        if self.radius_meters:
            return self.radius_meters
        # Adaptive defaults — most specific first
        if self.block or self.chowk or self.landmark or self.road:
            return 1000
        if self.phase or self.sector or self.market or self.bazaar:
            return 2000
        if (self.housing_society or self.colony or self.neighborhood
                or self.locality or self.village or self.mouza or self.basti):
            return 3000
        if self.town or self.union_council:
            return 5000
        if self.city or self.tehsil:
            return 10000
        if self.district:
            return 20000
        if self.division or self.province:
            return 50000
        return 10000  # sensible default


class SearchPlan(BaseModel):
    category: str = Field(description="Business/place category, e.g. hotel, school, restaurant.")
    location: Location
    filters: Dict[str, str] = Field(default_factory=dict)
    fields: List[FieldName] = Field(default_factory=lambda: [
        "business_name", "category", "address", "area", "phone", "website"
    ])
    requested_result_count: Optional[int] = Field(default=None, ge=1, le=500)
    export_format: Optional[Literal["excel", "pdf", "both"]] = None
    original_query: str = ""
    debug_info: Optional[Dict] = None
