/**
 * Export filter application.
 * Filters businesses based on user-selected criteria before export.
 */

import { BusinessRecord, ExportFilters } from "../deduplication/types";

/**
 * Apply filters to a set of businesses.
 * Returns filtered array and a description of active filters.
 */
export function applyFilters(
  businesses: BusinessRecord[],
  filters?: ExportFilters
): { filtered: BusinessRecord[]; activeFilters: string[] } {
  if (!filters) return { filtered: businesses, activeFilters: [] };

  const activeFilters: string[] = [];
  let result = [...businesses];

  // Category filter
  if (filters.category) {
    const catLower = filters.category.toLowerCase();
    result = result.filter(b =>
      b.category?.toLowerCase().includes(catLower) ||
      catLower.includes(b.category?.toLowerCase() || "")
    );
    activeFilters.push(`Category: ${filters.category}`);
  }

  // Minimum rating filter
  if (filters.minRating != null && filters.minRating > 0) {
    result = result.filter(b => b.rating != null && b.rating >= filters.minRating!);
    activeFilters.push(`Rating >= ${filters.minRating}`);
  }

  // Has phone filter
  if (filters.hasPhone) {
    result = result.filter(b => !!b.phone || (b.phones && b.phones.length > 0));
    activeFilters.push("Has phone number");
  }

  // Has website filter
  if (filters.hasWebsite) {
    result = result.filter(b => !!b.website || (b.websites && b.websites.length > 0));
    activeFilters.push("Has website");
  }

  return { filtered: result, activeFilters };
}
