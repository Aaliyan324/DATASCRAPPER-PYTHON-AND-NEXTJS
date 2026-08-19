from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PlaceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    place_id: Optional[str] = None
    business_name: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    country: str = "Pakistan"
    phone: Optional[str] = None
    phone_national: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    business_status: Optional[str] = None
    source: str = "Google Places API (New)"
    retrieved_at: Optional[str] = None
