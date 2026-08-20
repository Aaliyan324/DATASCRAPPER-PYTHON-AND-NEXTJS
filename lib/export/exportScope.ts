/**
 * Export scope resolution.
 * Filters businesses based on the selected export scope.
 */

import { BusinessRecord, ExportScope } from "../deduplication/types";
import { canonicalizeAreaName } from "../deduplication/normalize";

/**
 * Resolve which businesses to include based on export scope.
 */
export function resolveScope(
  allBusinesses: BusinessRecord[],
  scope: ExportScope,
  options: {
    areas?: string[];
    selectedIds?: string[];
    currentResults?: BusinessRecord[];
  }
): BusinessRecord[] {
  switch (scope) {
    case "current":
      return options.currentResults || allBusinesses;

    case "area":
      if (!options.areas || options.areas.length === 0) return allBusinesses;
      return filterByAreas(allBusinesses, options.areas);

    case "multiple_areas":
      if (!options.areas || options.areas.length === 0) return allBusinesses;
      return filterByAreas(allBusinesses, options.areas);

    case "entire_search":
      return allBusinesses;

    case "all":
      return allBusinesses;

    case "selected":
      if (!options.selectedIds || options.selectedIds.length === 0) return [];
      const idSet = new Set(options.selectedIds);
      return allBusinesses.filter(b => b.id && idSet.has(b.id));

    default:
      return allBusinesses;
  }
}

/**
 * Filter businesses by area names (with alias normalization).
 */
function filterByAreas(businesses: BusinessRecord[], areas: string[]): BusinessRecord[] {
  const canonicalAreas = areas.map(a => canonicalizeAreaName(a).toLowerCase());

  return businesses.filter(b => {
    // Check area field
    if (b.area) {
      const bizArea = canonicalizeAreaName(b.area).toLowerCase();
      if (canonicalAreas.some(ca => ca === bizArea || bizArea.includes(ca) || ca.includes(bizArea))) {
        return true;
      }
    }

    // Check address field for area mentions
    if (b.address) {
      const addrLower = b.address.toLowerCase();
      if (canonicalAreas.some(ca => addrLower.includes(ca))) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Get all unique areas from a set of businesses.
 */
export function extractAvailableAreas(businesses: BusinessRecord[]): string[] {
  const areaSet = new Set<string>();

  for (const b of businesses) {
    if (b.area) {
      const canonical = canonicalizeAreaName(b.area);
      if (canonical) areaSet.add(canonical);
    }
  }

  return [...areaSet].sort();
}

/**
 * Get all unique categories from a set of businesses.
 */
export function extractAvailableCategories(businesses: BusinessRecord[]): string[] {
  const catSet = new Set<string>();

  for (const b of businesses) {
    if (b.category) {
      catSet.add(b.category);
    }
  }

  return [...catSet].sort();
}
