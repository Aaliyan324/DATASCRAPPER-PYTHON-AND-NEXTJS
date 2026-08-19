from __future__ import annotations

import time
from datetime import datetime, timezone

import requests

from ai.schemas import SearchPlan
from config import settings


BASE_URL = "https://places.googleapis.com/v1/places:searchText"


class GooglePlacesClient:
    def __init__(self):
        if not settings.google_maps_api_key:
            raise RuntimeError("GOOGLE_MAPS_API_KEY is missing from .env")
        self.session = requests.Session()

    def _field_mask(self, plan: SearchPlan) -> str:
        fields = {
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.types",
            "places.googleMapsUri",
            # Always request phone and website -- these are critical data fields.
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
            "places.websiteUri",
        }

        requested = set(plan.fields)
        if "latitude" in requested or "longitude" in requested:
            fields.add("places.location")
        if "rating" in requested:
            fields.add("places.rating")
        if "review_count" in requested:
            fields.add("places.userRatingCount")
        if "business_status" in requested:
            fields.add("places.businessStatus")

        # Identity/location fields are useful even if not explicitly requested.
        fields |= {"places.displayName", "places.formattedAddress"}
        return ",".join(sorted(fields))

    def text_search(self, query: str, plan: SearchPlan) -> list[dict]:
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.google_maps_api_key,
            "X-Goog-FieldMask": self._field_mask(plan) + ",nextPageToken",
        }
        body = {
            "textQuery": query,
            "languageCode": "en",
            "regionCode": "PK",
            "pageSize": 20,
        }

        results = []
        page_token = None

        # Places Text Search (New) supports pagination and has a maximum result
        # window per query. We stop when no token is returned.
        for _ in range(3):
            if page_token:
                body["pageToken"] = page_token

            response = self.session.post(
                BASE_URL,
                headers=headers,
                json=body,
                timeout=settings.request_timeout,
            )

            if response.status_code in (429, 500, 502, 503, 504):
                time.sleep(1.5)
                response = self.session.post(
                    BASE_URL,
                    headers=headers,
                    json=body,
                    timeout=settings.request_timeout,
                )

            if response.status_code >= 400:
                try:
                    detail = response.json()
                except Exception:
                    detail = response.text
                raise RuntimeError(
                    f"Google Places API error {response.status_code}: {detail}"
                )

            payload = response.json()
            retrieved = datetime.now(timezone.utc).isoformat()
            for place in payload.get("places", []):
                place["_retrieved_at"] = retrieved
            results.extend(payload.get("places", []))

            page_token = payload.get("nextPageToken")
            if not page_token:
                break

            # Google may require a short delay before the next page token works.
            time.sleep(0.4)

        return results
