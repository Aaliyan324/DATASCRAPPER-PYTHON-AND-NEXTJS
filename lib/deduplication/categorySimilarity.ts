/**
 * Category similarity for deduplication.
 * Uses existing CATEGORY_SYNONYMS from constants.ts.
 */

import { CATEGORY_SYNONYMS } from "../data-engine/constants";

/**
 * Normalize a category string for comparison.
 * Lowercase, strip plurals, remove common filler words.
 */
function normalizeCategory(cat: string | null | undefined): string {
  if (!cat) return "";
  let s = cat.toLowerCase().trim();
  // Strip trailing 's' for plurals (but not "business" → "busines")
  s = s.replace(/\b(restaurants|shops|schools|clinics|hotels|pharmacies|salons|gyms)\b/g, (m) => {
    return m.replace(/s$/, "");
  });
  // Remove filler words
  s = s.replace(/\b(food|and|the|a)\b/g, "").trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

/**
 * Get the synonym group key for a category, if it exists.
 */
function getSynonymGroup(cat: string): string | null {
  const normalized = normalizeCategory(cat);
  if (!normalized) return null;

  for (const [key, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    const keyNorm = normalizeCategory(key);
    if (normalized === keyNorm) return key;
    if (Array.isArray(synonyms)) {
      for (const syn of synonyms) {
        if (normalizeCategory(syn) === normalized) return key;
      }
    }
  }
  return null;
}

/**
 * Compute category similarity between two categories.
 * Returns 0–100 score.
 *
 * - Exact match (after normalization): 100
 * - Same synonym group: 80
 * - One contains the other: 60
 * - No match: 0
 */
export function categorySimilarity(
  catA: string | null | undefined,
  catB: string | null | undefined
): number {
  if (!catA && !catB) return 100;
  if (!catA || !catB) return 0;

  const normA = normalizeCategory(catA);
  const normB = normalizeCategory(catB);

  if (!normA && !normB) return 100;
  if (!normA || !normB) return 0;
  if (normA === normB) return 100;

  // Check synonym groups
  const groupA = getSynonymGroup(catA);
  const groupB = getSynonymGroup(catB);

  if (groupA && groupB && groupA === groupB) return 80;

  // Containment check (e.g. "restaurant" contains "restaur")
  if (normA.includes(normB) || normB.includes(normA)) return 60;

  // Token overlap as fallback
  const tokensA = new Set(normA.split(/\s+/));
  const tokensB = new Set(normB.split(/\s+/));
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  const union = tokensA.size + tokensB.size - overlap;
  if (union > 0) {
    const jaccard = overlap / union;
    if (jaccard >= 0.5) return Math.round(jaccard * 60);
  }

  return 0;
}
