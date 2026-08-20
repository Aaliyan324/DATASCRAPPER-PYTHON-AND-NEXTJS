/**
 * Geographic distance and scoring for deduplication.
 * Builds on existing haversineKm() from ranking.ts.
 */

import { haversineKm } from "../data-engine/ranking";

/**
 * Calculate geographic distance in meters between two coordinate pairs.
 * Returns null if any coordinate is missing.
 */
export function geoDistanceMeters(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  return haversineKm(lat1, lng1, lat2, lng2) * 1000; // convert km → meters
}

/**
 * Map geographic distance to a 0–100 dedup score.
 *
 * Thresholds from spec:
 *   < 20m   → 100 (very strong duplicate signal)
 *   20–50m  → 80  (strong duplicate signal)
 *   50–150m → 50  (possible duplicate)
 *   > 150m  → 10  (usually different physical locations)
 *   null    → -1  (no signal — coordinates missing)
 */
export function geoScore(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number {
  const dist = geoDistanceMeters(lat1, lng1, lat2, lng2);
  if (dist === null) return -1;

  if (dist < 20) return 100;
  if (dist <= 50) return 80;
  if (dist <= 150) return 50;
  return 10;
}

/**
 * Check if two locations are at the "same physical location"
 * for hard-rule duplicate detection.
 */
export function isSamePhysicalLocation(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): boolean {
  const dist = geoDistanceMeters(lat1, lng1, lat2, lng2);
  if (dist === null) return false;
  return dist <= 50;
}
