import { SearchPlan } from "./types";
import { getEffectiveRadius } from "./ranking";

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

/**
 * Builds the field mask string for the Google Places API (New).
 */
function buildFieldMask(plan: SearchPlan): string {
  const fields = new Set<string>([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.types",
    "places.googleMapsUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.location",
  ]);

  if (plan.fields.includes("rating")) {
    fields.add("places.rating");
  }
  if (plan.fields.includes("review_count")) {
    fields.add("places.userRatingCount");
  }
  if (plan.fields.includes("business_status")) {
    fields.add("places.businessStatus");
  }

  return Array.from(fields).sort().join(",") + ",nextPageToken";
}

/**
 * Executes a text search on the Google Places API (New).
 */
export async function textSearch(query: string, plan: SearchPlan): Promise<any[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing from environment variables");
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": buildFieldMask(plan),
  };

  const body: Record<string, any> = {
    textQuery: query,
    languageCode: "en",
    regionCode: "PK",
    pageSize: 20,
  };

  // Inject location bias if location has resolved coordinates
  const loc = plan.location;
  if (loc.latitude !== null && loc.latitude !== undefined && loc.longitude !== null && loc.longitude !== undefined) {
    const radius = getEffectiveRadius(loc);
    body.locationBias = {
      circle: {
        center: {
          latitude: loc.latitude,
          longitude: loc.longitude,
        },
        radius: Math.min(radius, 50000.0), // Cap at Places API 50km max
      },
    };
  }

  const results: any[] = [];
  let pageToken: string | null = null;

  // Google Places Text Search (New) supports pagination, returning nextPageToken.
  // We fetch up to 3 pages (60 records max) per individual search query query.
  for (let page = 0; page < 3; page++) {
    const currentBody = { ...body };
    if (pageToken) {
      currentBody.pageToken = pageToken;
    }

    let response: Response;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        response = await fetch(BASE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(currentBody),
        });

        if (response.ok) {
          break;
        }

        // Retry on rate limits or server errors
        if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
          console.warn(`Places API status ${response.status}. Retrying in 1.5s...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        // Other client/auth errors - throw immediately
        const errText = await response.text();
        throw new Error(`Google Places API responded with status ${response.status}: ${errText}`);
      } catch (err) {
        if (attempts >= maxAttempts) {
          throw err;
        }
      }
    }

    // @ts-ignore
    if (!response || !response.ok) {
      throw new Error(`Google Places API failed after ${maxAttempts} attempts.`);
    }

    // @ts-ignore
    const payload = await response.json();
    const places = payload.places || [];
    const retrievedTime = new Date().toISOString();

    for (const p of places) {
      p._retrieved_at = retrievedTime;
    }

    results.push(...places);

    pageToken = payload.nextPageToken || null;
    if (!pageToken) {
      break;
    }

    // Short delay before request to let nextPageToken activate
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return results;
}
export type textSearchType = typeof textSearch;
