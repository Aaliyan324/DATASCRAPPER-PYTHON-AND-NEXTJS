/**
 * Professional multi-sheet XLSX exporter.
 *
 * Sheets:
 *   1. Businesses — main data
 *   2. Deduplication Groups — summary of each duplicate cluster
 *   3. Merged Records — per-original-record audit trail
 *   4. Export Info — metadata about the export
 */

import * as XLSX from "xlsx";
import { BusinessRecord, DuplicateGroup, ExportFilters } from "../deduplication/types";

interface XlsxExportOptions {
  businesses: BusinessRecord[];
  duplicateGroups: DuplicateGroup[];
  searchQuery: string;
  scope: string;
  areas: string[];
  rawCount: number;
  duplicatesRemoved: number;
  uniqueCount: number;
  filteredCount: number;
  activeFilters: string[];
}

/**
 * Generate and download a professional multi-sheet XLSX workbook.
 */
export function generateXlsx(opts: XlsxExportOptions): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Businesses ──
  const bizRows = opts.businesses.map((b, idx) => ({
    "#": idx + 1,
    "Business Name": b.name || "",
    "Category": b.category || "",
    "Full Address": buildFullAddress(b),
    "Address": b.address || "",
    "Area": b.area || "",
    "City": b.city || "",
    "District": b.district || "",
    "Province": b.province || "",
    "Phone": b.phone || "",
    "Additional Phones": (b.phones || []).filter(p => p !== b.phone).join(", "),
    "Website": b.website || "",
    "Additional Websites": (b.websites || []).filter(w => w !== b.website).join(", "),
    "Rating": b.rating ?? "",
    "Review Count": b.reviewCount ?? "",
    "Latitude": b.latitude ?? "",
    "Longitude": b.longitude ?? "",
    "Data Completeness": b.dataCompleteness != null ? `${b.dataCompleteness}%` : "",
    "Confidence Score": b.confidenceScore != null ? `${b.confidenceScore}%` : "",
    "Duplicate Group ID": b.duplicateGroupId || "",
    "Merged Records Count": b.mergedRecordCount ?? "",
  }));

  const ws1 = XLSX.utils.json_to_sheet(bizRows);
  ws1["!cols"] = [
    { wch: 4 },   // #
    { wch: 35 },  // Business Name
    { wch: 18 },  // Category
    { wch: 55 },  // Full Address
    { wch: 45 },  // Address
    { wch: 18 },  // Area
    { wch: 15 },  // City
    { wch: 15 },  // District
    { wch: 12 },  // Province
    { wch: 20 },  // Phone
    { wch: 25 },  // Additional Phones
    { wch: 30 },  // Website
    { wch: 30 },  // Additional Websites
    { wch: 8 },   // Rating
    { wch: 12 },  // Review Count
    { wch: 12 },  // Latitude
    { wch: 12 },  // Longitude
    { wch: 16 },  // Data Completeness
    { wch: 16 },  // Confidence Score
    { wch: 16 },  // Duplicate Group ID
    { wch: 18 },  // Merged Records Count
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Businesses");

  // ── Sheet 2: Deduplication Groups ──
  if (opts.duplicateGroups.length > 0) {
    const groupRows = opts.duplicateGroups.map(g => {
      const masterRecord = g.records.find(r => r.id === g.masterRecordId) || g.records[0];
      return {
        "Group ID": g.groupId,
        "Master Business": masterRecord?.name || "",
        "Merged Records": g.records.length,
        "Score": g.duplicateScore,
        "Reason": g.reason.join("; "),
      };
    });

    const ws2 = XLSX.utils.json_to_sheet(groupRows);
    ws2["!cols"] = [
      { wch: 12 }, // Group ID
      { wch: 40 }, // Master Business
      { wch: 16 }, // Merged Records
      { wch: 8 },  // Score
      { wch: 60 }, // Reason
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Deduplication Groups");
  }

  // ── Sheet 3: Merged Records ──
  if (opts.duplicateGroups.length > 0) {
    const mergedRows: any[] = [];
    for (const g of opts.duplicateGroups) {
      const masterRecord = g.records.find(r => r.id === g.masterRecordId) || g.records[0];
      for (const r of g.records) {
        mergedRows.push({
          "Duplicate Group ID": g.groupId,
          "Master Business": masterRecord?.name || "",
          "Original Business Name": r.name || "",
          "Original Full Address": buildFullAddress(r),
          "Original Address": r.address || "",
          "Original Phone": r.phone || "",
          "Original Website": r.website || "",
          "Original Category": r.category || "",
          "Original Latitude": r.latitude ?? "",
          "Original Longitude": r.longitude ?? "",
          "Duplicate Score": g.duplicateScore,
          "Merge Reason": g.reason.join("; "),
          "Source": r.source || "",
        });
      }
    }

    const ws3 = XLSX.utils.json_to_sheet(mergedRows);
    ws3["!cols"] = [
      { wch: 16 }, // Duplicate Group ID
      { wch: 35 }, // Master Business
      { wch: 35 }, // Original Business Name
      { wch: 55 }, // Original Full Address
      { wch: 45 }, // Original Address
      { wch: 20 }, // Original Phone
      { wch: 30 }, // Original Website
      { wch: 18 }, // Original Category
      { wch: 12 }, // Original Latitude
      { wch: 12 }, // Original Longitude
      { wch: 12 }, // Duplicate Score
      { wch: 50 }, // Merge Reason
      { wch: 20 }, // Source
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Merged Records");
  }

  // ── Sheet 4: Export Info ──
  const infoRows = [
    { "Field": "Search Query", "Value": opts.searchQuery },
    { "Field": "Export Scope", "Value": opts.scope },
    { "Field": "Selected Area(s)", "Value": opts.areas.join(", ") || "All" },
    { "Field": "Export Date", "Value": new Date().toLocaleString() },
    { "Field": "Raw Result Count", "Value": opts.rawCount },
    { "Field": "Duplicates Removed", "Value": opts.duplicatesRemoved },
    { "Field": "Unique Result Count", "Value": opts.uniqueCount },
    { "Field": "Final Export Count", "Value": opts.filteredCount },
    { "Field": "Duplicate Groups", "Value": opts.duplicateGroups.length },
    { "Field": "Filters Applied", "Value": opts.activeFilters.join("; ") || "None" },
  ];

  const ws4 = XLSX.utils.json_to_sheet(infoRows);
  ws4["!cols"] = [
    { wch: 22 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "Export Info");

  // ── Generate filename and download ──
  const filename = generateFilename(opts.areas, opts.businesses[0]?.category, "xlsx");
  XLSX.writeFile(wb, filename);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a human-readable full address string from all available address parts.
 * Example output: "Phase 4, Ghauri Town, Islamabad, Pakistan"
 */
export function buildFullAddress(b: BusinessRecord): string {
  const parts: string[] = [];

  if (b.address) parts.push(b.address);
  if (b.area && !parts.some(p => p.toLowerCase().includes(b.area!.toLowerCase()))) parts.push(b.area);
  if (b.city && !parts.some(p => p.toLowerCase().includes(b.city!.toLowerCase()))) parts.push(b.city);
  if (b.district && !parts.some(p => p.toLowerCase().includes(b.district!.toLowerCase()))) parts.push(b.district);
  if (b.province && !parts.some(p => p.toLowerCase().includes(b.province!.toLowerCase()))) parts.push(b.province);
  if (b.country && !parts.some(p => p.toLowerCase().includes(b.country!.toLowerCase()))) parts.push(b.country);

  return parts.join(", ");
}

// ─── Filename Generation ─────────────────────────────────────────────────────

export function generateFilename(
  areas: string[],
  category?: string,
  ext: string = "xlsx"
): string {
  const parts = ["PakistanEngine"];

  if (areas.length > 0) {
    const areaStr = areas.join("_").replace(/[^a-zA-Z0-9_]/g, "_");
    parts.push(areaStr);
  } else {
    parts.push("All");
  }

  if (category) {
    const catStr = category.replace(/[^a-zA-Z0-9_]/g, "_");
    parts.push(catStr);
  }

  return `${parts.join("_")}.${ext}`;
}
