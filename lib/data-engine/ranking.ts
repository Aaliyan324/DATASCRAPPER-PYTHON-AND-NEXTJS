import { Location, SearchPlan, PlaceRecord } from "./types";

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates the great-circle distance in kilometers between two points using the Haversine formula.
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Gets effective radius in meters based on administrative level specificity.
 */
export function getEffectiveRadius(loc: Location): number {
  if (loc.distance_meters) return loc.distance_meters;
  if (loc.radius_meters) return loc.radius_meters;

  if (loc.block || loc.chowk || loc.landmark || loc.road) {
    return 1000;
  }
  if (loc.phase || loc.sector || loc.market || loc.bazaar) {
    return 2000;
  }
  if (
    loc.housing_society ||
    loc.colony ||
    loc.neighborhood ||
    loc.locality ||
    loc.village ||
    loc.mouza ||
    loc.basti
  ) {
    return 3000;
  }
  if (loc.town || loc.union_council) {
    return 5000;
  }
  if (loc.city || loc.tehsil) {
    return 10000;
  }
  if (loc.district) {
    return 20000;
  }
  if (loc.division || loc.province) {
    return 50000;
  }
  return 10000; // default
}

function computeDistanceKm(record: PlaceRecord, loc: Location): number | null {
  if (
    loc.latitude === null ||
    loc.latitude === undefined ||
    loc.longitude === null ||
    loc.longitude === undefined
  ) {
    return null;
  }
  if (
    record.latitude === null ||
    record.latitude === undefined ||
    record.longitude === null ||
    record.longitude === undefined
  ) {
    return null;
  }
  return haversineKm(loc.latitude, loc.longitude, record.latitude, record.longitude);
}

function addressSimilarityScore(record: PlaceRecord, loc: Location): number {
  if (!record.address) return 0.0;
  const addrLower = record.address.toLowerCase();

  const tokens: string[] = [];
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
      tokens.push(val.toLowerCase());
    }
  }

  if (tokens.length === 0) return 0.0;
  const hits = tokens.filter((t) => addrLower.includes(t)).length;
  return hits / tokens.length;
}

export function scoreResult(record: PlaceRecord, plan: SearchPlan): number {
  const loc = plan.location;
  const dist = computeDistanceKm(record, loc);

  if (dist !== null) {
    const radiusKm = getEffectiveRadius(loc) / 1000.0;
    if (dist <= radiusKm) {
      // Inside radius
      return Math.max(0.5, 1.0 - dist / (radiusKm * 2));
    } else {
      // Outside radius, decays
      const overshoot = dist - radiusKm;
      return Math.max(0.0, 0.5 - overshoot / (radiusKm * 4));
    }
  }

  return addressSimilarityScore(record, loc) * 0.6;
}

/**
 * Calculates a completeness quality score (0-100)
 */
export function calculateQualityScore(record: PlaceRecord): number {
  let score = 0;
  
  if (record.place_id) score += 15;
  if (record.phone) score += 25;
  if (record.website) score += 25;
  if (record.address) score += 15;
  if (record.latitude !== null && record.longitude !== null) score += 10;
  if (record.rating !== null) score += 5;
  if (record.review_count != null && record.review_count > 0) score += 5;

  return score;
}

/**
 * Filters out results that are geographically too far and sorts by geographic score and proximity.
 */
export function filterAndRank(records: PlaceRecord[], plan: SearchPlan): PlaceRecord[] {
  const loc = plan.location;
  const radiusKm = getEffectiveRadius(loc) / 1000.0;

  let maxAllowedKm: number;
  if (loc.preposition === "inside") {
    maxAllowedKm = radiusKm * 1.2;
  } else if (loc.preposition === "in") {
    maxAllowedKm = radiusKm * 2.0;
  } else if (loc.preposition === "near") {
    maxAllowedKm = radiusKm * 4.0;
  } else {
    // around
    maxAllowedKm = radiusKm * 3.0;
  }

  const scored = records.map((r) => {
    const dist = computeDistanceKm(r, loc);
    const score = scoreResult(r, plan);
    return {
      ...r,
      distance_km: dist !== null ? Math.round(dist * 1000) / 1000 : null,
      location_match_score: Math.round(score * 1000) / 1000,
    };
  });

  // Sort: primary by geographic score desc, secondary by distance asc
  scored.sort((a, b) => {
    const scoreA = a.location_match_score ?? 0;
    const scoreB = b.location_match_score ?? 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const distA = a.distance_km ?? 9999;
    const distB = b.distance_km ?? 9999;
    return distA - distB;
  });

  const kept = scored.filter((r) => r.distance_km === null || r.distance_km <= maxAllowedKm);
  if (kept.length >= 5) {
    return kept;
  }
  return scored;
}
