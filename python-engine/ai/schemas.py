from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


FieldName = Literal[
    "business_name", "category", "address", "area", "phone", "website",
    "google_maps_url", "latitude", "longitude", "rating", "review_count",
    "opening_hours", "business_status"
]


class Location(BaseModel):
    country: str = "Pakistan"
    province: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    landmark: Optional[str] = None
    confident: bool = True
    confidence_note: Optional[str] = None

    def display_name(self) -> str:
        parts = [
            self.locality, self.city, self.tehsil, self.district,
            self.province, self.country
        ]
        return ", ".join(dict.fromkeys(x for x in parts if x))


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
