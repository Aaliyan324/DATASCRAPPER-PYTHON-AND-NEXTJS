"""Deduplication logic for scraped business records."""

from __future__ import annotations
from typing import Optional

from .normalizer import normalize_phone, normalize_website, clean_business_name


def is_duplicate(
    name_a: str,
    name_b: str,
    phone_a: Optional[str] = None,
    phone_b: Optional[str] = None,
    website_a: Optional[str] = None,
    website_b: Optional[str] = None,
    city_a: Optional[str] = None,
    city_b: Optional[str] = None,
    address_a: Optional[str] = None,
    address_b: Optional[str] = None,
) -> bool:
    """Determine if two business records are likely duplicates.

    Uses a multi-key strategy:
    1. Normalized phone match (strong signal)
    2. Normalized website/domain match (strong signal)
    3. Fuzzy name + city match with optional address similarity
    """
    # 1. Phone match
    norm_phone_a = normalize_phone(phone_a)
    norm_phone_b = normalize_phone(phone_b)
    if norm_phone_a and norm_phone_b and norm_phone_a == norm_phone_b:
        return True

    # 2. Website/domain match
    norm_web_a = normalize_website(website_a)
    norm_web_b = normalize_website(website_b)
    if norm_web_a and norm_web_b and norm_web_a == norm_web_b:
        return True

    # 3. Fuzzy name + city match
    clean_a = clean_business_name(name_a)
    clean_b = clean_business_name(name_b)
    city_norm_a = (city_a or "").strip().lower()
    city_norm_b = (city_b or "").strip().lower()

    if clean_a and clean_b and clean_a == clean_b and city_norm_a and city_norm_b and city_norm_a == city_norm_b:
        # Verify address similarity if available
        if address_a and address_b:
            addr_clean_a = re.sub(r"[^a-z0-9]", "", address_a.lower())
            addr_clean_b = re.sub(r"[^a-z0-9]", "", address_b.lower())
            if addr_clean_a in addr_clean_b or addr_clean_b in addr_clean_a:
                return True
        else:
            return True

    return False


def deduplicate_records(records: list) -> list:
    """Remove duplicate records from a list of BusinessRecord objects.

    Iterates through records and keeps only the first occurrence
    of each unique business (based on is_duplicate criteria).
    """
    from .query_models import BusinessRecord

    if not records:
        return records

    unique: list[BusinessRecord] = [records[0]]

    for record in records[1:]:
        is_dup = False
        for existing in unique:
            if is_duplicate(
                name_a=record.name,
                name_b=existing.name,
                phone_a=record.phone,
                phone_b=existing.phone,
                website_a=record.website,
                website_b=existing.website,
                city_a=record.city,
                city_b=existing.city,
                address_a=record.address,
                address_b=existing.address,
            ):
                is_dup = True
                # Merge data: fill in missing fields from duplicate
                if not existing.phone and record.phone:
                    existing.phone = record.phone
                if not existing.email and record.email:
                    existing.email = record.email
                if not existing.website and record.website:
                    existing.website = record.website
                if not existing.address and record.address:
                    existing.address = record.address
                if not existing.opening_hours and record.opening_hours:
                    existing.opening_hours = record.opening_hours
                break
        if not is_dup:
            unique.append(record)

    return unique


import re  # noqa: E402 (used in is_duplicate address comparison)
