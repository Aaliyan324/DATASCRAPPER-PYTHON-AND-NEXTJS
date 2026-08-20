/**
 * Smart Deduplication Orchestrator.
 *
 * Full pipeline:
 *   PlaceRecord[] → normalize → block → score → cluster → merge → DeduplicationResult
 *
 * This replaces the simple deduplicate() from data-engine/deduplicator.ts
 * for the post-scraping dedup stage.
 */

import { PlaceRecord } from "../data-engine/types";
import {
  BusinessRecord,
  DeduplicationResult,
  DuplicateGroup,
} from "./types";
import { buildBlockingIndex, getAllCandidatePairs } from "./blocking";
import { clusterDuplicates } from "./clustering";
import { mergeGroup, } from "./merge";
import { extractAllPhones } from "./phone";
import { extractAllWebsites } from "./website";
import { normalizeBusinessNameFull } from "./normalize";

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Run the full smart deduplication pipeline on a set of PlaceRecords.
 * Returns unique businesses, duplicate groups, and statistics.
 */
export function smartDeduplicate(records: PlaceRecord[]): DeduplicationResult {
  if (records.length === 0) {
    return {
      uniqueBusinesses: [],
      duplicateGroups: [],
      rawCount: 0,
      uniqueCount: 0,
      duplicatesRemoved: 0,
      duplicateGroupCount: 0,
    };
  }

  const rawCount = records.length;

  // ── 1. Convert PlaceRecord → BusinessRecord ──
  const businessRecords: BusinessRecord[] = records.map((r, idx) =>
    placeRecordToBusinessRecord(r, idx)
  );

  // ── 2. Fast exact-dedup pass (place_id + composite key) ──
  // This handles the obvious duplicates before expensive fuzzy matching
  const { unique: fastUnique, duplicateMap } = fastExactDedup(businessRecords);

  // If everything was unique, return early
  if (fastUnique.length <= 1) {
    return {
      uniqueBusinesses: fastUnique,
      duplicateGroups: [],
      rawCount,
      uniqueCount: fastUnique.length,
      duplicatesRemoved: rawCount - fastUnique.length,
      duplicateGroupCount: 0,
    };
  }

  // ── 3. Build blocking index ──
  const blockingIndex = buildBlockingIndex(fastUnique);

  // ── 4. Get candidate pairs ──
  const candidatePairs = getAllCandidatePairs(blockingIndex, fastUnique);

  // ── 5. Cluster duplicates ──
  const { groups, scoredPairs } = clusterDuplicates(fastUnique, candidatePairs, 60);

  // ── 6. Merge groups into master records ──
  const mergedMasters: BusinessRecord[] = [];
  const mergedRecordIds = new Set<string>();

  for (const group of groups) {
    const master = mergeGroup(group);
    mergedMasters.push(master);
    // Track which records were merged
    for (const r of group.records) {
      if (r.id) mergedRecordIds.add(r.id);
    }
  }

  // ── 7. Build final unique list ──
  // Include: masters + records that weren't part of any group
  const uniqueBusinesses: BusinessRecord[] = [];

  for (const master of mergedMasters) {
    uniqueBusinesses.push(master);
  }

  for (const record of fastUnique) {
    if (record.id && !mergedRecordIds.has(record.id)) {
      uniqueBusinesses.push(record);
    }
  }

  const uniqueCount = uniqueBusinesses.length;
  const duplicatesRemoved = rawCount - uniqueCount;

  return {
    uniqueBusinesses,
    duplicateGroups: groups,
    rawCount,
    uniqueCount,
    duplicatesRemoved,
    duplicateGroupCount: groups.length,
  };
}

// ─── PlaceRecord → BusinessRecord ────────────────────────────────────────────

function placeRecordToBusinessRecord(r: PlaceRecord, idx: number): BusinessRecord {
  const phones = extractAllPhones({
    phone: r.phone,
    additionalData: { phone_national: r.phone_national },
  });

  const websites = extractAllWebsites({
    website: r.website,
  });

  return {
    id: r.place_id || `record-${idx}`,
    name: r.business_name || "Unknown",
    category: r.category || undefined,
    address: r.address || undefined,
    area: r.area || undefined,
    city: r.city || undefined,
    district: r.district || undefined,
    province: r.province || undefined,
    country: r.country || "Pakistan",
    phone: r.phone || undefined,
    phones: phones.length > 0 ? phones : undefined,
    website: r.website || undefined,
    websites: websites.length > 0 ? websites : undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    placeId: r.place_id || undefined,
    rating: r.rating ?? undefined,
    reviewCount: r.review_count ?? undefined,
    source: r.source,
    googleMapsUrl: r.google_maps_url || undefined,
    businessStatus: r.business_status || undefined,
    _original: r,
  };
}

// ─── Fast Exact Dedup ────────────────────────────────────────────────────────

/**
 * Quick exact dedup pass before expensive fuzzy matching.
 * Handles:
 *   - Same place_id
 *   - Same composite key (normName|normPhone|normDomain|normAddr) with ≥2 fields
 */
function fastExactDedup(records: BusinessRecord[]): {
  unique: BusinessRecord[];
  duplicateMap: Map<string, string[]>;
} {
  const seenIds = new Set<string>();
  const seenComposite = new Map<string, number>(); // composite key → index in output
  const output: BusinessRecord[] = [];
  const duplicateMap = new Map<string, string[]>(); // master id → merged ids

  // Track which records are exact duplicates for group creation
  const exactGroups = new Map<number, number[]>(); // master idx → member idxs

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    // Place ID exact match
    if (r.placeId && seenIds.has(r.placeId)) {
      continue;
    }

    // Composite key
    const normName = normalizeBusinessNameFull(r.name);
    const normPhone = (r.phone || "").replace(/[^0-9+]/g, "");
    const normDomain = (r.websites?.[0] || r.website || "").toLowerCase().replace(/^(https?:\/\/)?(www\.)?/i, "").split("/")[0];
    const normAddr = (r.address || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const fields = [normName, normPhone, normDomain, normAddr];
    const meaningful = fields.filter(Boolean).length;
    const compositeKey = fields.join("|");

    if (meaningful >= 2 && seenComposite.has(compositeKey)) {
      const masterIdx = seenComposite.get(compositeKey)!;
      const group = exactGroups.get(masterIdx);
      if (group) {
        group.push(i);
      } else {
        exactGroups.set(masterIdx, [masterIdx, i]);
      }
      continue;
    }

    if (r.placeId) seenIds.add(r.placeId);
    if (meaningful >= 2) seenComposite.set(compositeKey, output.length);

    output.push(r);
  }

  return { unique: output, duplicateMap };
}

// ─── Debug Export ────────────────────────────────────────────────────────────

export { debugPair } from "./scoring";
