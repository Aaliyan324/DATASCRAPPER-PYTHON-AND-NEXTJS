from __future__ import annotations

import re
from urllib.parse import urlparse
from models.place import PlaceRecord


def _norm(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _domain(url: str | None) -> str:
    if not url:
        return ""
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


def deduplicate(records: list[PlaceRecord]) -> list[PlaceRecord]:
    seen_ids = set()
    seen_secondary = set()
    output = []

    for r in records:
        if r.place_id and r.place_id in seen_ids:
            continue

        secondary = (
            _norm(r.business_name),
            _norm(r.phone),
            _domain(r.website),
            _norm(r.address),
        )
        # Only use secondary matching when there is meaningful overlap.
        meaningful = sum(bool(x) for x in secondary)
        if meaningful >= 2 and secondary in seen_secondary:
            continue

        if r.place_id:
            seen_ids.add(r.place_id)
        if meaningful >= 2:
            seen_secondary.add(secondary)
        output.append(r)

    return output
