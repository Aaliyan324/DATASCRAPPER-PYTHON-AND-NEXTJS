from __future__ import annotations

import re
from urllib.parse import urlparse

from ai.schemas import SearchPlan
from models.place import PlaceRecord


def normalize_phone(value: str | None) -> str | None:
    """Return international format: +923001234567"""
    if not value:
        return None
    s = re.sub(r"[^\d+]", "", value)
    if s.startswith("0092"):
        s = "+" + s[2:]
    elif s.startswith("92") and not s.startswith("+"):
        s = "+" + s
    elif s.startswith("03") and len(s) >= 10:
        s = "+92" + s[1:]
    elif s.startswith("0") and len(s) >= 10:
        # Landline: 042 1234567 -> +92421234567
        s = "+92" + s[1:]
    return s or None


def normalize_phone_national(value: str | None) -> str | None:
    """Return national format: 03001234567"""
    international = normalize_phone(value)
    if not international:
        return None
    # Strip the +92 prefix and prepend 0
    if international.startswith("+92"):
        return "0" + international[3:]
    return international


def normalize_website(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    if not value.startswith(("http://", "https://")):
        value = "https://" + value
    return value


def normalize_text(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip()


def normalize_place(raw: dict, plan: SearchPlan) -> PlaceRecord:
    display = raw.get("displayName") or {}
    location = raw.get("location") or {}
    types = raw.get("types") or []
    address = normalize_text(raw.get("formattedAddress"))
    area = None

    # Best-effort area extraction without inventing data.
    if address:
        parts = [p.strip() for p in address.split(",") if p.strip()]
        if len(parts) >= 3:
            area = parts[-3]

    raw_phone = raw.get("nationalPhoneNumber") or raw.get("internationalPhoneNumber")

    # Always extract coordinates (field mask now always includes places.location).
    lat = location.get("latitude") if location else None
    lng = location.get("longitude") if location else None

    return PlaceRecord(
        place_id=raw.get("id"),
        business_name=normalize_text(display.get("text")),
        category=plan.category,
        address=address,
        area=area,
        city=plan.location.city,
        district=plan.location.district,
        province=plan.location.province,
        country="Pakistan",
        phone=normalize_phone(raw_phone),
        phone_national=normalize_phone_national(raw_phone),
        website=normalize_website(raw.get("websiteUri")),
        google_maps_url=raw.get("googleMapsUri"),
        latitude=lat,
        longitude=lng,
        rating=raw.get("rating"),
        review_count=raw.get("userRatingCount"),
        business_status=raw.get("businessStatus"),
        source="Google Places API (New)",
        retrieved_at=raw.get("_retrieved_at"),
    )
