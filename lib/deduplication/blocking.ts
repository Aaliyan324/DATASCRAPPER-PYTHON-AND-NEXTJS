/**
 * Candidate blocking / indexing for O(n log n) dedup.
 * Avoids O(n²) by only comparing records that share at least one blocking key.
 */

import { BusinessRecord, BlockingIndex } from "./types";
import { normalizeBusinessNameFull } from "./normalize";
import { normalizePhoneToInternational, extractAllPhones } from "./phone";
import { normalizeWebsiteCanonical, extractAllWebsites } from "./website";

// ─── Geohash (simplified 3-char) ─────────────────────────────────────────────

function simpleGeohash(lat: number, lng: number): string {
  // 3-char geohash ≈ 150km cells — coarse but effective for blocking
  const latBucket = Math.floor(lat / 2);
  const lngBucket = Math.floor(lng / 2);
  return `${latBucket}_${lngBucket}`;
}

// ─── Build Blocking Index ────────────────────────────────────────────────────

/**
 * Build all blocking indices for a set of business records.
 */
export function buildBlockingIndex(records: BusinessRecord[]): BlockingIndex {
  const phoneIndex = new Map<string, number[]>();
  const domainIndex = new Map<string, number[]>();
  const cityIndex = new Map<string, number[]>();
  const geohashIndex = new Map<string, number[]>();
  const nameTokenIndex = new Map<string, number[]>();
  const categoryIndex = new Map<string, number[]>();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    // Phone blocking: index by each normalized phone
    const phones = extractAllPhones(r);
    for (const p of phones) {
      addToIndex(phoneIndex, p, i);
    }

    // Website blocking: index by canonical domain
    const sites = extractAllWebsites(r);
    for (const s of sites) {
      addToIndex(domainIndex, s, i);
    }

    // City blocking
    if (r.city) {
      addToIndex(cityIndex, r.city.toLowerCase().trim(), i);
    }

    // Geohash blocking
    if (r.latitude != null && r.longitude != null) {
      const hash = simpleGeohash(r.latitude, r.longitude);
      addToIndex(geohashIndex, hash, i);
    }

    // Name token blocking: first 2 tokens of normalized name
    const normName = normalizeBusinessNameFull(r.name);
    if (normName) {
      const tokens = normName.split(/\s+/).filter(Boolean).slice(0, 2).sort().join("|");
      if (tokens) {
        addToIndex(nameTokenIndex, tokens, i);
      }
    }

    // Category blocking
    if (r.category) {
      addToIndex(categoryIndex, r.category.toLowerCase().trim(), i);
    }
  }

  return { phoneIndex, domainIndex, cityIndex, geohashIndex, nameTokenIndex, categoryIndex };
}

// ─── Get Candidate Pairs ─────────────────────────────────────────────────────

/**
 * For a given record index, find all candidate pair indices from the blocking index.
 * Uses a union of all blocking keys — a record is a candidate if it shares
 * ANY blocking key with the query record.
 */
export function getCandidates(index: BlockingIndex, recordIdx: number, records: BusinessRecord[]): Set<number> {
  const candidates = new Set<number>();
  const r = records[recordIdx];

  // Phone candidates
  const phones = extractAllPhones(r);
  for (const p of phones) {
    const indices = index.phoneIndex.get(p);
    if (indices) {
      for (const idx of indices) {
        if (idx !== recordIdx) candidates.add(idx);
      }
    }
  }

  // Website candidates
  const sites = extractAllWebsites(r);
  for (const s of sites) {
    const indices = index.domainIndex.get(s);
    if (indices) {
      for (const idx of indices) {
        if (idx !== recordIdx) candidates.add(idx);
      }
    }
  }

  // City candidates (only useful as a secondary filter)
  if (r.city) {
    const indices = index.cityIndex.get(r.city.toLowerCase().trim());
    if (indices) {
      for (const idx of indices) {
        if (idx !== recordIdx) candidates.add(idx);
      }
    }
  }

  // Geohash candidates
  if (r.latitude != null && r.longitude != null) {
    const hash = simpleGeohash(r.latitude, r.longitude);
    const indices = index.geohashIndex.get(hash);
    if (indices) {
      for (const idx of indices) {
        if (idx !== recordIdx) candidates.add(idx);
      }
    }
  }

  // Name token candidates
  const normName = normalizeBusinessNameFull(r.name);
  if (normName) {
    const tokens = normName.split(/\s+/).filter(Boolean).slice(0, 2).sort().join("|");
    if (tokens) {
      const indices = index.nameTokenIndex.get(tokens);
      if (indices) {
        for (const idx of indices) {
          if (idx !== recordIdx) candidates.add(idx);
        }
      }
    }
  }

  return candidates;
}

/**
 * Get all unique candidate pairs from the blocking index.
 * Returns an array of [i, j] pairs where i < j.
 */
export function getAllCandidatePairs(index: BlockingIndex, records: BusinessRecord[]): [number, number][] {
  const pairSet = new Set<string>();
  const pairs: [number, number][] = [];

  const addPair = (i: number, j: number) => {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const key = `${lo}:${hi}`;
    if (!pairSet.has(key)) {
      pairSet.add(key);
      pairs.push([lo, hi]);
    }
  };

  // Phone pairs (strongest signal — always compare)
  for (const [, indices] of index.phoneIndex) {
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        addPair(indices[a], indices[b]);
      }
    }
  }

  // Website pairs
  for (const [, indices] of index.domainIndex) {
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        addPair(indices[a], indices[b]);
      }
    }
  }

  // Geohash pairs (only within same cell)
  for (const [, indices] of index.geohashIndex) {
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        addPair(indices[a], indices[b]);
      }
    }
  }

  // Name token pairs (within same token bucket)
  for (const [, indices] of index.nameTokenIndex) {
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        addPair(indices[a], indices[b]);
      }
    }
  }

  // City pairs — only if they also share name tokens (to avoid O(n²) within a city)
  for (const [, cityIndices] of index.cityIndex) {
    // For large cities, limit to name-token overlap
    if (cityIndices.length > 200) {
      // Skip city-only blocking for large cities — rely on other indices
      continue;
    }
    for (let a = 0; a < cityIndices.length; a++) {
      for (let b = a + 1; b < cityIndices.length; b++) {
        addPair(cityIndices[a], cityIndices[b]);
      }
    }
  }

  return pairs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addToIndex(index: Map<string, number[]>, key: string, value: number) {
  if (!key) return;
  const existing = index.get(key);
  if (existing) {
    existing.push(value);
  } else {
    index.set(key, [value]);
  }
}
