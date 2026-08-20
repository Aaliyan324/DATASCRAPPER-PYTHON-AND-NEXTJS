/**
 * Enhanced website normalization for dedup comparison.
 * Builds on existing normalizer.ts normalizeWebsiteDomain().
 */

import { normalizeWebsiteDomain as baseNormalizeDomain } from "../data-engine/normalizer";

/**
 * Normalize website to canonical base domain.
 * Handles subdomain stripping (m., www., maps.), protocol, paths, query params.
 */
export function normalizeWebsiteCanonical(url: string | null | undefined): string {
  if (!url) return "";
  let domain = baseNormalizeDomain(url);
  if (!domain) return "";

  // Strip common subdomains
  domain = domain
    .replace(/^m\./, "")
    .replace(/^www\./, "")
    .replace(/^maps\./, "")
    .replace(/^local\./, "");

  return domain;
}

/**
 * Extract all website domains from a record.
 */
export function extractAllWebsites(record: {
  website?: string | null;
  websites?: string[];
  additionalData?: any;
}): string[] {
  const sites: string[] = [];
  const seen = new Set<string>();

  const addSite = (raw: string | null | undefined) => {
    if (!raw) return;
    const normalized = normalizeWebsiteCanonical(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      sites.push(normalized);
    }
  };

  addSite(record.website);
  if (record.websites) {
    for (const w of record.websites) addSite(w);
  }
  if (record.additionalData?.websites && Array.isArray(record.additionalData.websites)) {
    for (const w of record.additionalData.websites) addSite(w);
  }

  return sites;
}

/**
 * Compare two sets of website domains.
 * Returns 0-1 similarity.
 * -1 = no signal (both empty).
 */
export function compareWebsiteSets(sitesA: string[], sitesB: string[]): number {
  if (sitesA.length === 0 || sitesB.length === 0) return -1;

  const setA = new Set(sitesA);
  const setB = new Set(sitesB);

  for (const s of setA) {
    if (setB.has(s)) return 1.0;
  }

  return 0.0;
}
