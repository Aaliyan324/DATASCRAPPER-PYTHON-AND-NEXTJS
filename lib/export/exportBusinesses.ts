/**
 * Main export orchestrator.
 *
 * Pipeline: resolve scope → apply filters → generate file(s)
 *
 * This is the single entry point for all exports (XLSX, PDF, or both).
 */

import {
  BusinessRecord,
  DuplicateGroup,
  ExportScope,
  ExportFormat,
  ExportFilters,
  ExportSummary,
} from "../deduplication/types";
import { resolveScope } from "./exportScope";
import { applyFilters } from "./exportFilters";
import { generateXlsx } from "./xlsxExporter";
import { generatePdf } from "./pdfExporter";

export interface ExportBusinessesConfig {
  businesses: BusinessRecord[];
  duplicateGroups: DuplicateGroup[];
  scope: ExportScope;
  areas?: string[];
  selectedIds?: string[];
  currentResults?: BusinessRecord[];
  filters?: ExportFilters;
  format: ExportFormat;
  searchQuery?: string;
  rawCount?: number;
  onProgress?: (step: string, pct: number) => void;
}

/**
 * Run the full export pipeline.
 */
export async function exportBusinesses(config: ExportBusinessesConfig): Promise<void> {
  const {
    businesses,
    duplicateGroups,
    scope,
    areas = [],
    selectedIds,
    currentResults,
    filters,
    format,
    searchQuery = "",
    rawCount,
    onProgress,
  } = config;

  // ── Step 1: Resolve scope ──
  onProgress?.("Collecting results", 10);
  const scoped = resolveScope(businesses, scope, {
    areas,
    selectedIds,
    currentResults,
  });

  // ── Step 2: Apply filters ──
  onProgress?.("Applying filters", 25);
  const { filtered, activeFilters } = applyFilters(scoped, filters);

  // ── Step 3: Build summary ──
  onProgress?.("Building duplicate groups", 40);
  const uniqueCount = businesses.length;
  const duplicatesRemoved = (rawCount ?? businesses.length) - uniqueCount;

  // Filter duplicate groups to only include groups relevant to the filtered set
  const filteredIds = new Set(filtered.map(b => b.id));
  const relevantGroups = duplicateGroups.filter(g =>
    g.records.some(r => r.id && filteredIds.has(r.id))
  );

  const exportOpts = {
    businesses: filtered,
    duplicateGroups: relevantGroups,
    searchQuery,
    scope: formatScopeLabel(scope, areas),
    areas,
    rawCount: rawCount ?? businesses.length,
    duplicatesRemoved,
    uniqueCount,
    filteredCount: filtered.length,
    activeFilters,
  };

  // ── Step 4: Generate file(s) ──
  onProgress?.(`Generating ${format.toUpperCase()}...`, 60);

  if (format === "xlsx") {
    generateXlsx(exportOpts);
  } else if (format === "pdf") {
    await generatePdf(exportOpts);
  }

  onProgress?.("Complete", 100);
}

/**
 * Compute an export summary without generating files.
 * Useful for showing the user what will be exported before confirming.
 */
export function computeExportSummary(config: ExportBusinessesConfig): ExportSummary {
  const {
    businesses,
    scope,
    areas = [],
    selectedIds,
    currentResults,
    filters,
    rawCount,
  } = config;

  const scoped = resolveScope(businesses, scope, {
    areas,
    selectedIds,
    currentResults,
  });

  const { filtered, activeFilters } = applyFilters(scoped, filters);
  const uniqueCount = businesses.length;
  const duplicatesRemoved = (rawCount ?? businesses.length) - uniqueCount;

  return {
    scope: formatScopeLabel(scope, areas),
    selectedAreas: areas,
    rawCount: rawCount ?? businesses.length,
    duplicatesRemoved,
    uniqueCount,
    filteredCount: filtered.length,
    activeFilters,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatScopeLabel(scope: ExportScope, areas: string[]): string {
  switch (scope) {
    case "current":
      return "Current Search Results";
    case "area":
      return areas.join(", ") || "Specific Area";
    case "multiple_areas":
      return areas.join(", ") || "Multiple Areas";
    case "entire_search":
      return "Entire Search";
    case "all":
      return "All Available Results";
    case "selected":
      return "Selected Businesses";
    default:
      return scope;
  }
}
