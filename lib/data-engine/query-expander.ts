import { SearchPlan } from "./types";
import { CATEGORY_SYNONYMS } from "./constants";

/**
 * Helper to build the most specific location string.
 */
export function buildSpecificLocationString(plan: SearchPlan): string {
  const loc = plan.location;
  const parts: string[] = [];
  const seen = new Set<string>();

  const fieldsToCheck: (keyof typeof loc)[] = [
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
      const lower = val.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        parts.push(val);
        if (parts.length >= 3) break;
      }
    }
  }

  if (parts.length === 0) {
    // build display name
    const displayParts = [
      loc.block, loc.phase, loc.sector, loc.chowk, loc.market, loc.bazaar,
      loc.road, loc.landmark, loc.basti, loc.mouza, loc.village, loc.colony,
      loc.neighborhood, loc.locality, loc.housing_society, loc.town, loc.city,
      loc.tehsil, loc.district, loc.province, loc.country
    ];
    return Array.from(new Set(displayParts.filter(Boolean))).join(", ");
  }

  return parts.join(", ") + ", Pakistan";
}

/**
 * Builds search queries with synonyms and location variants for Google Places API.
 */
export function buildSearchQueries(plan: SearchPlan, maxQueries = 4): string[] {
  const loc = plan.location;
  const category = plan.category.trim();
  const synonyms = CATEGORY_SYNONYMS[category.toLowerCase()] || [category];
  const queries: string[] = [];

  const ownership = plan.filters.ownership;
  const terms = ownership
    ? synonyms.map((s) => `${ownership} ${s}`)
    : synonyms;

  const specificLoc = buildSpecificLocationString(plan);

  // 1. Primary queries - specific location + category synonyms
  for (const term of terms.slice(0, 2)) {
    queries.push(`${term} in ${specificLoc}`);
  }

  // 2. Hyperlocal coordinates mapping with parent city
  if (loc.housing_society && loc.city && loc.housing_society.toLowerCase() !== loc.city.toLowerCase()) {
    queries.push(`${category} in ${loc.housing_society}, ${loc.city}, Pakistan`);
  }
  if (loc.village || loc.mouza || loc.basti) {
    const rural = loc.village || loc.mouza || loc.basti;
    const parent = loc.tehsil || loc.city || loc.district;
    if (parent) {
      queries.push(`${category} near ${rural}, ${parent}, Pakistan`);
    }
  }
  if (loc.chowk || loc.road || loc.landmark) {
    const micro = loc.chowk || loc.road || loc.landmark;
    const parent = loc.city || loc.district;
    if (parent) {
      queries.push(`${category} near ${micro}, ${parent}, Pakistan`);
    }
  }

  // 3. Broader fallback: city or district level (for backup coverage)
  if (loc.city) {
    queries.push(`${category} in ${loc.city}, Pakistan`);
  } else if (loc.district) {
    const province = loc.province || "Pakistan";
    queries.push(`${category} in ${loc.district}, ${province}, Pakistan`);
  }

  // 4. Sector/block-specific query for Islamabad/Rawalpindi sectors
  if (loc.sector && loc.city) {
    const sectorQuery = loc.block || loc.sector; // e.g., F-7/2 or F-7
    queries.push(`${category} in ${sectorQuery} ${loc.city}, Pakistan`);
  }

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const uniqueQueries: string[] = [];
  for (const q of queries) {
    const lower = q.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueQueries.push(q);
    }
  }

  return uniqueQueries.slice(0, maxQueries);
}
