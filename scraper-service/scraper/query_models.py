"""Pydantic models for the scraper service API."""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class LocationModel(BaseModel):
    query: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None


class FiltersModel(BaseModel):
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None


class ScrapeRequest(BaseModel):
    """Structured query sent from Next.js after deterministic parsing."""
    category: str
    location: LocationModel
    filters: FiltersModel = Field(default_factory=FiltersModel)
    fields: list[str] = Field(default_factory=lambda: [
        "business_name", "category", "address", "city", "phone", "website", "rating"
    ])
    keywords: list[str] = Field(default_factory=list)
    limit: int = 50


class JobProgress(BaseModel):
    job_id: str
    status: str  # queued | running | completed | failed
    progress: int = 0
    stage: str = ""
    records_found: int = 0
    pages_scraped: int = 0
    pages_failed: int = 0
    error: Optional[str] = None


class BusinessRecord(BaseModel):
    """A single scraped and normalized business record."""
    name: str
    category: str = ""
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_range: Optional[str] = None
    opening_hours: Optional[str] = None
    description: Optional[str] = None
    source: str = "OpenStreetMap"
    source_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ScrapeResponse(BaseModel):
    job_id: str
    status: str = "queued"


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    records: list[BusinessRecord]
