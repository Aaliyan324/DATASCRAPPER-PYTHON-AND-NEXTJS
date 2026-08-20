"use client";

import React, { useState, useMemo, useCallback } from "react";
import { X, Download, FileSpreadsheet, FileText, Loader2, Check } from "lucide-react";
import {
  BusinessRecord,
  DuplicateGroup,
  ExportScope,
  ExportFormat,
  ExportFilters,
  ExportSummary,
} from "@/lib/deduplication/types";
import { exportBusinesses, computeExportSummary } from "@/lib/export/exportBusinesses";
import { extractAvailableAreas, extractAvailableCategories } from "@/lib/export/exportScope";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessRecord[];
  duplicateGroups: DuplicateGroup[];
  searchQuery: string;
  rawCount: number;
  currentResults?: BusinessRecord[];
}

const SCOPE_OPTIONS: { value: ExportScope; label: string; description: string }[] = [
  { value: "current", label: "Current Results", description: "Export only the currently visible results" },
  { value: "area", label: "Specific Area", description: "Export businesses from a specific area" },
  { value: "multiple_areas", label: "Multiple Areas", description: "Export from multiple selected areas" },
  { value: "entire_search", label: "Entire Search", description: "Export all results from this search" },
  { value: "all", label: "All Available", description: "Export all discovered businesses" },
  { value: "selected", label: "Selected", description: "Export only checked businesses" },
];

export default function ExportDialog({
  isOpen,
  onClose,
  businesses,
  duplicateGroups,
  searchQuery,
  rawCount,
  currentResults,
}: ExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>("current");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [filters, setFilters] = useState<ExportFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ step: "", pct: 0 });
  const [showFilters, setShowFilters] = useState(false);

  // Available areas and categories
  const availableAreas = useMemo(() => extractAvailableAreas(businesses), [businesses]);
  const availableCategories = useMemo(() => extractAvailableCategories(businesses), [businesses]);

  // Live summary computation
  const summary: ExportSummary | null = useMemo(() => {
    if (!isOpen) return null;
    try {
      return computeExportSummary({
        businesses,
        duplicateGroups,
        scope,
        areas: selectedAreas,
        selectedIds: scope === "selected" ? [...selectedIds] : undefined,
        currentResults,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        format,
        searchQuery,
        rawCount,
      });
    } catch {
      return null;
    }
  }, [isOpen, businesses, duplicateGroups, scope, selectedAreas, selectedIds, currentResults, filters, format, searchQuery, rawCount]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress({ step: "Starting...", pct: 0 });

    try {
      await exportBusinesses({
        businesses,
        duplicateGroups,
        scope,
        areas: selectedAreas,
        selectedIds: scope === "selected" ? [...selectedIds] : undefined,
        currentResults,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        format,
        searchQuery,
        rawCount,
        onProgress: (step, pct) => setProgress({ step, pct }),
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
      setProgress({ step: "", pct: 0 });
    }
  }, [businesses, duplicateGroups, scope, selectedAreas, selectedIds, currentResults, filters, format, searchQuery, rawCount]);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-[#1a1d2e] border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Export Data</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Scope Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Export Scope</label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                    scope === opt.value
                      ? "border-purple-500 bg-purple-500/10 text-white"
                      : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Area Selection (for area / multiple_areas scope) */}
          {(scope === "area" || scope === "multiple_areas") && availableAreas.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {scope === "area" ? "Select Area" : "Select Areas"}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableAreas.map(area => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedAreas.includes(area)
                        ? "border-purple-500 bg-purple-500/20 text-purple-300"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {selectedAreas.includes(area) && <Check className="w-3 h-3 inline mr-1" />}
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Format</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat("xlsx")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  format === "xlsx"
                    ? "border-green-500 bg-green-500/10 text-green-300"
                    : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">Excel (XLSX)</span>
              </button>
              <button
                onClick={() => setFormat("pdf")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  format === "pdf"
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">PDF Report</span>
              </button>
            </div>
          </div>

          {/* Filters Toggle */}
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            {showFilters && (
              <div className="mt-3 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 space-y-3">
                {/* Category */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Category</label>
                  <select
                    value={filters.category || ""}
                    onChange={e => setFilters(f => ({ ...f, category: e.target.value || undefined }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Minimum Rating</label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={filters.minRating || 0}
                    onChange={e => setFilters(f => ({ ...f, minRating: parseFloat(e.target.value) || undefined }))}
                    className="w-full accent-purple-500"
                  />
                  <div className="text-xs text-slate-500">{filters.minRating || "No minimum"}</div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasPhone || false}
                      onChange={e => setFilters(f => ({ ...f, hasPhone: e.target.checked || undefined }))}
                      className="accent-purple-500"
                    />
                    Has Phone
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasWebsite || false}
                      onChange={e => setFilters(f => ({ ...f, hasWebsite: e.target.checked || undefined }))}
                      className="accent-purple-500"
                    />
                    Has Website
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Export Summary */}
          {summary && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-3">Export Summary</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Scope</span>
                  <span className="text-white">{summary.scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Raw Results</span>
                  <span className="text-white">{summary.rawCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duplicates Removed</span>
                  <span className="text-amber-400">{summary.duplicatesRemoved.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unique Businesses</span>
                  <span className="text-white">{summary.uniqueCount.toLocaleString()}</span>
                </div>
                {summary.activeFilters.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Filters</span>
                    <span className="text-purple-300">{summary.activeFilters.join(", ")}</span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-1.5 mt-1.5 flex justify-between">
                  <span className="text-slate-300 font-medium">Final Export</span>
                  <span className="text-green-400 font-bold">{summary.filteredCount.toLocaleString()} businesses</span>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-sm text-purple-300">{progress.step}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (summary?.filteredCount === 0)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {summary ? `${summary.filteredCount.toLocaleString()} Records` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
