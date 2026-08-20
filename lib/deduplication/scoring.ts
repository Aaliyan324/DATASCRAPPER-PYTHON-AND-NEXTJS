/**
 * Multi-signal duplicate scoring engine.
 *
 * Scoring weights (0–100 total):
 *   Business Name Similarity    0–30
 *   Phone Similarity            0–25
 *   Website Similarity          0–15
 *   Address Similarity          0–15
 *   Geographic Proximity        0–15
 *   Category Similarity         0–10
 *
 * Hard rules override the numeric score.
 */

import { BusinessRecord, ScoringResult, ScoringSignals } from "./types";
import { normalizeBusinessNameFull, normalizeAddress, extractBranchComponents, canonicalizeAreaName } from "./normalize";
import { combinedNameSimilarity } from "./nameSimilarity";
import { extractAllPhones, comparePhoneSets } from "./phone";
import { extractAllWebsites, compareWebsiteSets } from "./website";
import { categorySimilarity } from "./categorySimilarity";
import { geoScore, geoDistanceMeters, isSamePhysicalLocation } from "./geo";
import { levenshteinSimilarity } from "./nameSimilarity";

// ─── Main Scoring Function ───────────────────────────────────────────────────

/**
 * Compute the duplicate score between two business records.
 * Returns a score 0–100 with reasons and per-signal breakdown.
 */
export function computeDuplicateScore(a: BusinessRecord, b: BusinessRecord): ScoringResult {
  const reasons: string[] = [];

  // ── Hard rule: same place_id → auto-merge ──
  if (a.placeId && b.placeId && a.placeId === b.placeId) {
    return {
      score: 100,
      reasons: ["Same Google Place ID"],
      signals: {
        nameSimilarity: 100,
        phoneSimilarity: 100,
        websiteSimilarity: 100,
        addressSimilarity: 100,
        geographicScore: 100,
        geographicDistance: 0,
        categorySimilarity: 100,
      },
    };
  }

  // ── Compute all signals ──
  const signals = computeSignals(a, b);

  // ── Weighted score ──
  const nameScore = signals.nameSimilarity * 0.30;       // 0–30
  const phoneScore = Math.max(0, signals.phoneSimilarity) * 0.25;  // 0–25
  const websiteScore = Math.max(0, signals.websiteSimilarity) * 0.15;  // 0–15
  const addressScore = signals.addressSimilarity * 0.15;  // 0–15
  const geoSignalScore = Math.max(0, signals.geographicScore) * 0.15;  // 0–15
  const catScore = signals.categorySimilarity * 0.10;     // 0–10

  let totalScore = Math.round(nameScore + phoneScore + websiteScore + addressScore + geoSignalScore + catScore);

  // ── Build reasons ──
  if (signals.phoneSimilarity === 1) reasons.push("Same phone number");
  if (signals.websiteSimilarity === 1) reasons.push("Same website domain");
  if (signals.nameSimilarity >= 90) reasons.push(`Name similarity ${signals.nameSimilarity}%`);
  if (signals.geographicDistance !== null && signals.geographicDistance <= 50) {
    reasons.push(`${Math.round(signals.geographicDistance)}m geographic distance`);
  }
  if (signals.addressSimilarity >= 80) reasons.push(`Address similarity ${signals.addressSimilarity}%`);
  if (signals.categorySimilarity >= 80) reasons.push("Same category");

  // ── Hard rule: different cities → cap at 50 ──
  if (a.city && b.city && a.city.toLowerCase() !== b.city.toLowerCase()) {
    // Different cities — very likely different businesses
    totalScore = Math.min(totalScore, 30);
    reasons.push("Different cities");
  }

  // ── Branch detection: same brand, different area ──
  const branchCap = detectBranchConflict(a, b);
  if (branchCap !== null) {
    totalScore = Math.min(totalScore, branchCap);
    reasons.push("Same brand, different branch locations");
  }

  // ── Bonus: same phone + highly similar name + same location → boost ──
  if (
    signals.phoneSimilarity === 1 &&
    signals.nameSimilarity >= 85 &&
    (signals.geographicDistance === null || signals.geographicDistance <= 100)
  ) {
    totalScore = Math.max(totalScore, 90);
    if (!reasons.includes("Same phone number")) reasons.push("Same phone number");
    reasons.push("Strong phone + name + location match");
  }

  // ── Bonus: same website + highly similar name + same area → boost ──
  if (
    signals.websiteSimilarity === 1 &&
    signals.nameSimilarity >= 85 &&
    signals.addressSimilarity >= 70
  ) {
    totalScore = Math.max(totalScore, 85);
    reasons.push("Strong website + name + address match");
  }

  // ── Bonus: very close coordinates + similar name + same category → boost ──
  if (
    signals.geographicDistance !== null &&
    signals.geographicDistance <= 20 &&
    signals.nameSimilarity >= 80 &&
    signals.categorySimilarity >= 60
  ) {
    totalScore = Math.max(totalScore, 88);
    reasons.push("Very close coordinates + similar name + same category");
  }

  // Clamp to 0–100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return { score: totalScore, reasons, signals };
}

// ─── Signal Computation ──────────────────────────────────────────────────────

function computeSignals(a: BusinessRecord, b: BusinessRecord): ScoringSignals {
  // Name similarity
  const normNameA = normalizeBusinessNameFull(a.name);
  const normNameB = normalizeBusinessNameFull(b.name);
  const nameSim = combinedNameSimilarity(normNameA, normNameB);

  // Phone similarity
  const phonesA = extractAllPhones(a);
  const phonesB = extractAllPhones(b);
  const phoneSim = comparePhoneSets(phonesA, phonesB);
  // phoneSim: 1 = match, 0 = mismatch, -1 = no signal
  // Map to 0–1 range for scoring (no signal → 0 contribution)
  const phoneSimScore = phoneSim === -1 ? 0 : phoneSim;

  // Website similarity
  const sitesA = extractAllWebsites(a);
  const sitesB = extractAllWebsites(b);
  const websiteSim = compareWebsiteSets(sitesA, sitesB);
  const websiteSimScore = websiteSim === -1 ? 0 : websiteSim;

  // Address similarity
  const normAddrA = normalizeAddress(a.address);
  const normAddrB = normalizeAddress(b.address);
  const addrSim = levenshteinSimilarity(normAddrA, normAddrB);

  // Geographic
  const dist = geoDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  const geo = geoScore(a.latitude, a.longitude, b.latitude, b.longitude);

  // Category
  const catSim = categorySimilarity(a.category, b.category);

  return {
    nameSimilarity: nameSim,
    phoneSimilarity: phoneSimScore,
    websiteSimilarity: websiteSimScore,
    addressSimilarity: addrSim,
    geographicScore: geo,
    geographicDistance: dist,
    categorySimilarity: catSim,
  };
}

// ─── Branch Detection ────────────────────────────────────────────────────────

/**
 * Detect if two records are the same brand but different branches.
 * Returns a score cap (0–100) if branch conflict detected, null otherwise.
 *
 * Key principle: KFC Gulberg ≠ KFC DHA Phase 5
 */
function detectBranchConflict(a: BusinessRecord, b: BusinessRecord): number | null {
  const compA = extractBranchComponents(a.name);
  const compB = extractBranchComponents(b.name);

  // If neither has a qualifier, no branch conflict
  if (!compA.qualifier && !compB.qualifier) return null;

  // If both have qualifiers and they differ, AND cores are similar
  if (compA.qualifier && compB.qualifier && compA.qualifier !== compB.qualifier) {
    const coreSim = combinedNameSimilarity(compA.core, compB.core);
    if (coreSim >= 70) {
      // Same brand, different qualifiers — check if areas are actually different
      const areaA = canonicalizeAreaName(a.area || compA.qualifier);
      const areaB = canonicalizeAreaName(b.area || compB.qualifier);

      if (areaA !== areaB) {
        // Different areas — cap score to prevent merge
        // But if coordinates are very close, they might be the same place
        const dist = geoDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
        if (dist !== null && dist <= 50) {
          // Very close — probably same place, different naming
          return null;
        }
        return 40; // Cap at 40 — below merge threshold
      }
    }
  }

  // If one has a qualifier and the other doesn't, check if the qualifier
  // matches the other's area
  if (compA.qualifier && !compB.qualifier) {
    const areaB = canonicalizeAreaName(b.area);
    const qualA = canonicalizeAreaName(compA.qualifier);
    if (areaB && qualA && qualA !== areaB && !areaB.includes(qualA) && !qualA.includes(areaB)) {
      const coreSim = combinedNameSimilarity(compA.core, compB.core);
      if (coreSim >= 70) return 45;
    }
  }

  if (!compA.qualifier && compB.qualifier) {
    const areaA = canonicalizeAreaName(a.area);
    const qualB = canonicalizeAreaName(compB.qualifier);
    if (areaA && qualB && qualB !== areaA && !areaA.includes(qualB) && !qualB.includes(areaA)) {
      const coreSim = combinedNameSimilarity(compA.core, compB.core);
      if (coreSim >= 70) return 45;
    }
  }

  return null;
}

// ─── Debug Output ────────────────────────────────────────────────────────────

/**
 * Generate a debug report for a pair of records.
 */
export function debugPair(a: BusinessRecord, b: BusinessRecord): {
  businessA: string;
  businessB: string;
  signals: ScoringSignals;
  score: number;
  decision: "MERGED" | "KEEP_SEPARATE";
  reasons: string[];
} {
  const result = computeDuplicateScore(a, b);
  return {
    businessA: a.name,
    businessB: b.name,
    signals: result.signals,
    score: result.score,
    decision: result.score >= 60 ? "MERGED" : "KEEP_SEPARATE",
    reasons: result.reasons,
  };
}
