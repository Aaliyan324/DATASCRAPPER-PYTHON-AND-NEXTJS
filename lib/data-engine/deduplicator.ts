import { PlaceRecord } from "./types";
import { normalizeWebsiteDomain } from "./normalizer";

function norm(s: string | null | undefined): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Global deduplication engine.
 * Priority 1: Google Place ID (place_id)
 * Priority 2: Secondary compound keys (Fuzzy Name, Phone, Domain, Address) when at least 2 fields overlap
 */
export function deduplicate(records: PlaceRecord[]): PlaceRecord[] {
  const seenIds = new Set<string>();
  const seenSecondary = new Set<string>();
  const output: PlaceRecord[] = [];

  for (const r of records) {
    if (r.place_id && seenIds.has(r.place_id)) {
      continue;
    }

    const normName = norm(r.business_name);
    const normPhone = norm(r.phone);
    const normDomain = normalizeWebsiteDomain(r.website);
    const normAddr = norm(r.address);

    const secondaryFields = [normName, normPhone, normDomain, normAddr];
    const meaningfulCount = secondaryFields.filter(Boolean).length;

    // Create a composite string key for secondary matching
    const secondaryKey = `${normName}|${normPhone}|${normDomain}|${normAddr}`;

    if (meaningfulCount >= 2 && seenSecondary.has(secondaryKey)) {
      continue;
    }

    if (r.place_id) {
      seenIds.add(r.place_id);
    }
    if (meaningfulCount >= 2) {
      seenSecondary.add(secondaryKey);
    }
    output.push(r);
  }

  return output;
}
