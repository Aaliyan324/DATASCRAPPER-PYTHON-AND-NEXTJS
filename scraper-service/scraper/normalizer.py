"""Data normalization utilities for cleaning scraped business data."""

from __future__ import annotations
import re
from typing import Optional


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize phone numbers to a digits-only comparable format.

    Strips all non-digit characters and handles Pakistani country code (+92).
    """
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("92") and len(digits) > 10:
        digits = "0" + digits[2:]
    return digits or None


def normalize_website(url: Optional[str]) -> Optional[str]:
    """Normalize website URLs for easy domain comparison.

    Strips protocol, www, trailing slashes, and query parameters.
    e.g. "https://www.example.pk/about/" -> "example.pk"
    """
    if not url:
        return None
    try:
        clean = url.strip().lower()
        clean = re.sub(r"^(https?://)?(www\.)?", "", clean)
        clean = clean.rstrip("/")
        clean = clean.split("?")[0]
        return clean or None
    except Exception:
        return None


def clean_business_name(name: str) -> str:
    """Clean a business name for fuzzy comparison.

    Removes punctuation and common trailing corporate words.
    """
    name = name.lower()
    name = re.sub(r"[.,\/#!$%\^&\*;:{}=\-_`~()]", "", name)
    name = re.sub(r"\s+", " ", name)
    name = re.sub(
        r"\b(pvt|ltd|limited|private|inc|co|company|group|"
        r"restaurant|cafe|school|hotel|agency|realtors)\b",
        "",
        name,
    )
    return name.strip()


def clean_text(value: Optional[str]) -> str:
    """Normalize whitespace in a text value."""
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_url(url: Optional[str]) -> Optional[str]:
    """Ensure a URL has a scheme."""
    if not url:
        return None
    url = url.strip()
    if url and not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url
