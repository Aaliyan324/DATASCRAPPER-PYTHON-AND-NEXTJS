import { Location } from "./types";
import {
  PAKISTAN_LOCATIONS,
  PAKISTAN_TEHSILS,
  PAKISTAN_SOCIETIES,
  LOCATION_ALIASES,
} from "./constants";
import { haversineKm } from "./ranking";

const geocodeCache = new Map<string, any>();

/**
 * Builds the most specific geocoding query string from a Location.
 */
function buildGeocodeQuery(loc: Location): string {
  const specificParts: string[] = [];
  const fieldsToCheck: (keyof Location)[] = [
    "block",
    "phase",
    "sector",
    "chowk",
    "market",
    "bazaar",
    "road",
    "landmark",
    "basti",
    "mouza",
    "village",
    "colony",
    "neighborhood",
    "locality",
    "housing_society",
    "town",
    "city",
    "tehsil",
    "district",
  ];

  for (const f of fieldsToCheck) {
    const val = loc[f];
    if (typeof val === "string" && val) {
      specificParts.push(val);
    }
  }

  if (specificParts.length === 0) return "";

  // Use at most 4 components to keep query focused
  return specificParts.slice(0, 4).join(", ") + ", Pakistan";
}

/**
 * Helper to case-insensitively match a value in a registry.
 */
function matchRegistryKey(value: string, registry: Record<string, any>): string | null {
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  for (const name of Object.keys(registry)) {
    if (name.toLowerCase().replace(/\s+/g, " ") === v) {
      return name;
    }
  }
  return null;
}

/**
 * Infer the location type based on filled properties.
 */
function inferLocationType(loc: Location): string | null {
  if (loc.block) return "block";
  if (loc.phase) return "phase";
  if (loc.sector) return "sector";
  if (loc.chowk) return "chowk";
  if (loc.market || loc.bazaar) return "market";
  if (loc.road) return "road";
  if (loc.landmark) return "landmark";
  if (loc.basti) return "basti";
  if (loc.mouza) return "mouza";
  if (loc.village) return "village";
  if (loc.colony) return "colony";
  if (loc.neighborhood) return "neighborhood";
  if (loc.locality) return "locality";
  if (loc.housing_society) return "housing_society";
  if (loc.town) return "town";
  if (loc.union_council) return "union_council";
  if (loc.city) return "city";
  if (loc.tehsil) return "tehsil";
  if (loc.district) return "district";
  if (loc.division) return "division";
  if (loc.province) return "province";
  return null;
}

/**
 * Merges a Geocoding API result into the Location model.
 */
function applyGeocodeResult(loc: Location, result: any): Location {
  const geometry = result.geometry || {};
  const latLng = geometry.location || {};
  const lat = latLng.lat ?? null;
  const lng = latLng.lng ?? null;

  const updates: Partial<Location> = {};
  if (lat !== null && lng !== null) {
    updates.latitude = lat;
    updates.longitude = lng;
  }

  const addressComponents = result.address_components || [];
  const acMap: Record<string, string> = {};
  for (const comp of addressComponents) {
    for (const t of comp.types || []) {
      acMap[t] = comp.long_name || "";
    }
  }

  // Only fill fields that are currently missing
  if (!loc.province && acMap["administrative_area_level_1"]) {
    updates.province = acMap["administrative_area_level_1"];
  }
  if (!loc.district && acMap["administrative_area_level_2"]) {
    updates.district = acMap["administrative_area_level_2"];
  }
  if (!loc.tehsil && acMap["administrative_area_level_3"]) {
    updates.tehsil = acMap["administrative_area_level_3"];
  }
  if (!loc.city && acMap["locality"]) {
    updates.city = acMap["locality"];
  }
  if (!loc.locality && (acMap["sublocality"] || acMap["sublocality_level_1"])) {
    updates.locality = acMap["sublocality"] || acMap["sublocality_level_1"];
  }

  updates.confidence = Math.min(loc.confidence + 0.1, 1.0);
  updates.confident = true;

  // Determine viewport radius if available
  const viewport = geometry.viewport;
  if (viewport && viewport.northeast && viewport.southwest) {
    const ne = viewport.northeast;
    const sw = viewport.southwest;
    const centerLat = (ne.lat + sw.lat) / 2;
    const centerLng = (ne.lng + sw.lng) / 2;
    const radiusMeters = haversineKm(centerLat, centerLng, ne.lat, ne.lng) * 1000;
    
    if (radiusMeters > 100 && !loc.radius_meters) {
      updates.radius_meters = Math.round(radiusMeters);
    }
  }

  return { ...loc, ...updates };
}

/**
 * Enriches the Location with known hierarchy data from the static database.
 */
export function enrichFromKnowledge(loc: Location): Location {
  const candidates: { field: keyof Location; val: any }[] = [
    { field: "housing_society", val: loc.housing_society },
    { field: "bazaar", val: loc.bazaar },
    { field: "market", val: loc.market },
    { field: "chowk", val: loc.chowk },
    { field: "road", val: loc.road },
    { field: "landmark", val: loc.landmark },
    { field: "block", val: loc.block },
    { field: "phase", val: loc.phase },
    { field: "sector", val: loc.sector },
    { field: "basti", val: loc.basti },
    { field: "mouza", val: loc.mouza },
    { field: "village", val: loc.village },
    { field: "colony", val: loc.colony },
    { field: "neighborhood", val: loc.neighborhood },
    { field: "locality", val: loc.locality },
    { field: "town", val: loc.town },
    { field: "city", val: loc.city },
    { field: "tehsil", val: loc.tehsil },
    { field: "district", val: loc.district },
  ];

  const updates: Partial<Location> = {};

  // 1. Try candidates against PAKISTAN_LOCATIONS
  for (const c of candidates) {
    if (!c.val || typeof c.val !== "string") continue;
    const key = matchRegistryKey(c.val, PAKISTAN_LOCATIONS);
    if (key) {
      const data = PAKISTAN_LOCATIONS[key];
      if (!loc.province) updates.province = data.province;
      if (!loc.district) updates.district = data.district;
      if (!loc.city && data.city) updates.city = data.city;
      if (!loc.tehsil && data.tehsil) updates.tehsil = data.tehsil;
      break;
    }
  }

  // 2. Try tehsils registry
  for (const c of candidates) {
    if (!c.val || typeof c.val !== "string") continue;
    const key = matchRegistryKey(c.val, PAKISTAN_TEHSILS);
    if (key) {
      const data = PAKISTAN_TEHSILS[key];
      if (!loc.province) updates.province = data.province;
      if (!loc.district) updates.district = data.district;
      if (!loc.tehsil && data.tehsil) updates.tehsil = data.tehsil;
      if (!loc.city && data.city) updates.city = data.city;
      if (!loc.town && !PAKISTAN_LOCATIONS[key]) updates.town = key;
      break;
    }
  }

  // 3. Mark housing societies
  if (loc.housing_society) {
    const key = matchRegistryKey(loc.housing_society, PAKISTAN_SOCIETIES);
    if (key && !loc.location_type) {
      updates.location_type = "housing_society";
    }
  }

  // 4. Infer location type
  if (!updates.location_type && !loc.location_type) {
    const ltype = inferLocationType(loc);
    if (ltype) updates.location_type = ltype;
  }

  // 5. Apply aliases
  if (loc.city) {
    const canonical = LOCATION_ALIASES[loc.city.toLowerCase()];
    if (canonical && canonical !== loc.city) {
      updates.city = canonical;
    }
  }

  return { ...loc, ...updates };
}

/**
 * Resolves a Location to coordinates and enriches via Google Geocoding API.
 */
export async function resolveLocation(loc: Location): Promise<Location> {
  // Already geocoded?
  if (loc.latitude !== null && loc.latitude !== undefined && loc.longitude !== null && loc.longitude !== undefined) {
    return loc;
  }

  const enriched = enrichFromKnowledge(loc);
  const query = buildGeocodeQuery(enriched);

  if (!query) {
    console.warn("Geocode: no query components for location", loc);
    return { ...enriched, confidence: Math.max(enriched.confidence - 0.2, 0.0) };
  }

  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return applyGeocodeResult(enriched, geocodeCache.get(cacheKey));
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_MAPS_API_KEY is missing from environment");
    return enriched;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&region=pk&language=en`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn("Geocode API HTTP error status:", response.status);
      return { ...enriched, confidence: Math.max(enriched.confidence - 0.3, 0.0) };
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.warn("Geocode: no results found for query:", query);
      return {
        ...enriched,
        confidence: Math.max(enriched.confidence - 0.3, 0.0),
        confidence_note: `No geocode results for: ${query}`,
      };
    }

    const bestResult = results[0];
    geocodeCache.set(cacheKey, bestResult);
    
    return applyGeocodeResult(enriched, bestResult);

  } catch (error) {
    console.error("Geocoding failed for query:", query, error);
    return { ...enriched, confidence: Math.max(enriched.confidence - 0.3, 0.0) };
  }
}
