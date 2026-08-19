from __future__ import annotations

from ai.schemas import Location
from pakistan.locations import PAKISTAN_LOCATIONS


class PakistanLocationResolver:
    def resolve(self, location: Location) -> Location | None:
        candidates = [
            location.city, location.district, location.tehsil,
            location.locality, location.landmark
        ]
        for candidate in candidates:
            if not candidate:
                continue
            key = self._match(candidate)
            if key:
                data = PAKISTAN_LOCATIONS[key]
                return Location(
                    country="Pakistan",
                    province=data.get("province"),
                    district=data.get("district"),
                    city=data.get("city"),
                    tehsil=location.tehsil,
                    locality=location.locality,
                    landmark=location.landmark,
                    confident=True,
                )
        return location

    def _match(self, value: str) -> str | None:
        v = " ".join(value.lower().split())
        for name in PAKISTAN_LOCATIONS:
            if " ".join(name.lower().split()) == v:
                return name
        return None
