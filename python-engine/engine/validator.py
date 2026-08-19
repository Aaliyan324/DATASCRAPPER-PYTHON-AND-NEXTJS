from models.place import PlaceRecord


def quality_stats(raw_results: int, unique_records: list[PlaceRecord], duplicates_removed: int) -> dict:
    n = len(unique_records)
    if n == 0:
        return {
            "raw_results": raw_results,
            "duplicates_removed": duplicates_removed,
            "unique_records": 0,
            "with_phone": 0,
            "with_website": 0,
            "with_address": 0,
            "completeness": 0.0,
        }

    with_phone = sum(bool(r.phone) for r in unique_records)
    with_website = sum(bool(r.website) for r in unique_records)
    with_address = sum(bool(r.address) for r in unique_records)

    core_fields = ["business_name", "category", "address", "phone", "website"]
    completeness = (
        sum(bool(getattr(r, f)) for r in unique_records for f in core_fields)
        / (n * len(core_fields))
        * 100
    )

    return {
        "raw_results": raw_results,
        "duplicates_removed": duplicates_removed,
        "unique_records": n,
        "with_phone": with_phone,
        "with_website": with_website,
        "with_address": with_address,
        "completeness": completeness,
    }
