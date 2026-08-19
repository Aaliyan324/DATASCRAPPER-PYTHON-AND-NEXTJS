"""Field extractors for HTML pages, JSON-LD, and structured data.

Currently focused on OSM tag extraction. Provides extensible extraction
functions for future sources (HTML pages, JSON-LD, etc.).
"""

from __future__ import annotations
import re
from typing import Optional


def extract_phone(text: str) -> Optional[str]:
    """Extract a phone number from free-form text.

    Matches Pakistani formats: +92-XXX-XXXXXXX, 03XX-XXXXXXX, 042-XXXXXXX, etc.
    """
    pattern = r"(?:\+92|0)\s?(?:[2-9]\d{1,2}|\d{3})\s?[-.]?\s?\d{3}\s?[-.]?\s?\d{4}"
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None


def extract_email(text: str) -> Optional[str]:
    """Extract an email address from free-form text."""
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None


def extract_rating(text: str) -> Optional[float]:
    """Extract a rating value (1.0-5.0) from text like '4.5 stars' or 'rated 4.2'."""
    match = re.search(r"(?:rating|rated|score|★)\s*:?\s*([1-5]\.\d|[1-5])", text, re.IGNORECASE)
    if match:
        try:
            val = float(match.group(1))
            if 1.0 <= val <= 5.0:
                return val
        except ValueError:
            pass
    return None


def extract_from_json_ld(html: str) -> dict:
    """Extract structured data from JSON-LD script tags in HTML.

    Returns a dict with any recognized fields, or empty dict.
    """
    import json

    results = {}
    # Find JSON-LD blocks
    pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    matches = re.findall(pattern, html, re.DOTALL | re.IGNORECASE)

    for match in matches:
        try:
            data = json.loads(match)
            if isinstance(data, list):
                for item in data:
                    _merge_json_ld(results, item)
            else:
                _merge_json_ld(results, data)
        except (json.JSONDecodeError, TypeError):
            continue

    return results


def _merge_json_ld(target: dict, data: dict):
    """Merge relevant fields from a JSON-LD object into target dict."""
    if not isinstance(data, dict):
        return

    field_map = {
        "name": "name",
        "telephone": "phone",
        "email": "email",
        "url": "website",
        "address": "address",
        "aggregateRating": "rating_data",
    }

    for src_key, dst_key in field_map.items():
        if src_key in data and not target.get(dst_key):
            val = data[src_key]
            if src_key == "address" and isinstance(val, dict):
                parts = [
                    val.get("streetAddress", ""),
                    val.get("addressLocality", ""),
                    val.get("addressRegion", ""),
                    val.get("postalCode", ""),
                    val.get("addressCountry", ""),
                ]
                target[dst_key] = ", ".join(p for p in parts if p)
            elif src_key == "aggregateRating" and isinstance(val, dict):
                rating_val = val.get("ratingValue")
                if rating_val:
                    try:
                        target["rating"] = float(rating_val)
                    except (ValueError, TypeError):
                        pass
            else:
                target[dst_key] = str(val) if val else None
