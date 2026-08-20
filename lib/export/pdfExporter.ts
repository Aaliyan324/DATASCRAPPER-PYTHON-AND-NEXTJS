/**
 * Professional PDF report exporter with deduplication sections.
 *
 * Sections:
 *   1. Header — "PAKISTAN ENGINE - Business Data Report"
 *   2. Summary — query, scope, counts
 *   3. Business table — auto-paginated
 *   4. Deduplication Summary — stats + group table
 *   5. Deduplication Details — per-group breakdown (limited for large exports)
 */

import { BusinessRecord, DuplicateGroup } from "../deduplication/types";
import { generateFilename, buildFullAddress } from "./xlsxExporter";

interface PdfExportOptions {
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

const BRAND_COLOR = [75, 103, 160] as const;
const MAX_DETAIL_GROUPS = 50; // Limit detailed groups in PDF for large exports

/**
 * Generate and download a professional PDF report.
 */
export async function generatePdf(opts: PdfExportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Helper: draw page header ──
  function drawHeader(title: string) {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 14, 15);
  }

  // ── Helper: page footer ──
  function drawFooter() {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont("helvetica", "normal");
    const pageNum = doc.getNumberOfPages();
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text("Pakistan Engine — Business Data Report", 14, pageHeight - 8);
    doc.text(new Date().toLocaleDateString(), pageWidth - 14, pageHeight - 8, { align: "right" });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 1: Header + Summary + Business Table
  // ══════════════════════════════════════════════════════════════

  drawHeader("PAKISTAN ENGINE — Business Data Report");

  // Summary block
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  let y = 30;
  const summaryLines = [
    `Search Query: "${opts.searchQuery || "N/A"}"`,
    `Export Scope: ${opts.scope}`,
    `Area(s): ${opts.areas.join(", ") || "All"}`,
    `Total Raw Results: ${opts.rawCount}`,
    `Duplicates Removed: ${opts.duplicatesRemoved}`,
    `Unique Businesses: ${opts.uniqueCount}`,
    `Exported: ${opts.filteredCount}`,
    `Duplicate Groups: ${opts.duplicateGroups.length}`,
  ];

  if (opts.activeFilters.length > 0) {
    summaryLines.push(`Filters: ${opts.activeFilters.join(", ")}`);
  }

  for (const line of summaryLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  // ── Business Table ──
  const tableColumns = ["#", "Business", "Category", "Full Address", "Phone", "Website", "Rating"];
  const tableRows = opts.businesses.map((b, idx) => [
    idx + 1,
    b.name || "",
    b.category || "",
    buildFullAddress(b),
    b.phone || "",
    b.website || "",
    b.rating != null ? b.rating.toFixed(1) : "-",
  ]);

  // @ts-ignore
  autoTable(doc, {
    startY: y + 4,
    head: [tableColumns],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [...BRAND_COLOR],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 10, fontStyle: "bold" },
      1: { cellWidth: 45 },
      2: { cellWidth: 22 },
      3: { cellWidth: 60 },
      4: { cellWidth: 30 },
      5: { cellWidth: 45 },
      6: { cellWidth: 14, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      drawFooter();
    },
  });

  // ══════════════════════════════════════════════════════════════
  // DEDUPLICATION SUMMARY
  // ══════════════════════════════════════════════════════════════

  if (opts.duplicateGroups.length > 0) {
    // @ts-ignore
    const lastTableY = doc.lastAutoTable?.finalY || doc.internal.pageSize.getHeight() - 60;
    doc.addPage();
    drawHeader("DEDUPLICATION SUMMARY");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const dedupY = 30;
    doc.text(`Raw Results: ${opts.rawCount}`, 14, dedupY);
    doc.text(`Unique Businesses: ${opts.uniqueCount}`, 14, dedupY + 6);
    doc.text(`Duplicates Removed: ${opts.duplicatesRemoved}`, 14, dedupY + 12);
    doc.text(`Duplicate Groups: ${opts.duplicateGroups.length}`, 14, dedupY + 18);

    // Dedup groups table
    const groupColumns = ["Group ID", "Master Business", "Merged Records", "Confidence", "Reason"];
    const groupRows = opts.duplicateGroups.map(g => {
      const master = g.records.find(r => r.id === g.masterRecordId) || g.records[0];
      return [
        g.groupId,
        master?.name || "",
        `${g.records.length} records`,
        `${g.duplicateScore}%`,
        g.reason.join("; "),
      ];
    });

    // @ts-ignore
    autoTable(doc, {
      startY: dedupY + 26,
      head: [groupColumns],
      body: groupRows,
      theme: "striped",
      headStyles: {
        fillColor: [...BRAND_COLOR],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        drawHeader("DEDUPLICATION SUMMARY");
        drawFooter();
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // DEDUPLICATION DETAILS
  // ══════════════════════════════════════════════════════════════

  if (opts.duplicateGroups.length > 0) {
    const groupsToShow = opts.duplicateGroups.slice(0, MAX_DETAIL_GROUPS);

    for (const g of groupsToShow) {
      const master = g.records.find(r => r.id === g.masterRecordId) || g.records[0];

      doc.addPage();
      drawHeader(`DUPLICATE GROUP: ${g.groupId}`);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let dy = 30;
      doc.text(`Master: ${master?.name || "N/A"}`, 14, dy);
      dy += 7;
      doc.text(`Confidence: ${g.duplicateScore}%`, 14, dy);
      dy += 7;
      doc.text(`Merged Records: ${g.records.length}`, 14, dy);
      dy += 7;

      doc.setFont("helvetica", "bold");
      doc.text("Reasons:", 14, dy);
      doc.setFont("helvetica", "normal");
      for (const reason of g.reason) {
        dy += 5;
        doc.text(`  • ${reason}`, 14, dy);
      }

      dy += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Merged Records Detail:", 14, dy);
      doc.setFont("helvetica", "normal");

      // Table of merged records
      const detailColumns = ["#", "Name", "Full Address", "Phone", "Website", "Area", "Lat", "Lng"];
      const detailRows = g.records.map((r, idx) => [
        idx + 1,
        r.name || "",
        buildFullAddress(r),
        r.phone || "",
        r.website || "",
        r.area || "",
        r.latitude != null ? r.latitude.toFixed(5) : "",
        r.longitude != null ? r.longitude.toFixed(5) : "",
      ]);

      // @ts-ignore
      autoTable(doc, {
        startY: dy + 4,
        head: [detailColumns],
        body: detailRows,
        theme: "grid",
        headStyles: {
          fillColor: [...BRAND_COLOR],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1,
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 40 },
          2: { cellWidth: 55 },
          3: { cellWidth: 28 },
          4: { cellWidth: 38 },
          5: { cellWidth: 22 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
          drawHeader(`DUPLICATE GROUP: ${g.groupId}`);
          drawFooter();
        },
      });
    }

    // Note about truncated groups
    if (opts.duplicateGroups.length > MAX_DETAIL_GROUPS) {
      doc.addPage();
      drawHeader("DEDUPLICATION DETAILS");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Showing details for ${MAX_DETAIL_GROUPS} of ${opts.duplicateGroups.length} duplicate groups.`,
        14,
        35
      );
      doc.text(
        "For the complete deduplication data, please export the XLSX format which includes all groups.",
        14,
        42
      );
    }
  }

  // ── Save ──
  const filename = generateFilename(opts.areas, opts.businesses[0]?.category, "pdf");
  doc.save(filename);
}
