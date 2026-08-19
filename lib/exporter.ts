import * as XLSX from "xlsx";
import { Business } from "./db";

/**
 * Exports business dataset to an Excel spreadsheet file (.xlsx)
 */
export function exportToExcel(businesses: Business[], command: string) {
  const formatted = businesses.map((b, index) => ({
    "#": index + 1,
    "Business Name": b.name,
    Category: b.category,
    Address: b.address || "",
    Area: b.area || "",
    City: b.city || "",
    Country: b.country || "",
    Phone: b.phone || "",
    "Phone National": b.additionalData?.phone_national || "",
    Email: b.email || "",
    Website: b.website || "",
    Rating: b.rating || "",
    "Review Count": b.additionalData?.review_count || b.reviewCount || "",
    "Business Status": b.additionalData?.business_status || "",
    "Google Maps URL": b.additionalData?.google_maps_url || b.sourceUrl || "",
    Price: b.price || "",
    "Opening Hours": b.openingHours || "",
    Source: b.source,
    Latitude: b.latitude || "",
    Longitude: b.longitude || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Scraped Data");

  // Adjust column widths automatically
  const maxProps = [{ wch: 4 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 20 }, { wch: 15 }];
  worksheet["!cols"] = maxProps;

  const safeName = command.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 40);
  XLSX.writeFile(workbook, `scraper_${safeName || "export"}.xlsx`);
}

/**
 * Exports business dataset to a formatted PDF report with table layouts
 */
export async function exportToPDF(businesses: Business[], command: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF("landscape"); // Landscape fits tables better

  // Header Style Colors (Primary #4B67A0)
  doc.setFillColor(75, 103, 160);
  doc.rect(0, 0, 297, 24, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("COMMAND-BASED DATA SCRAPER REPORT", 14, 16);

  // Metadata block
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Search Command: "${command}"`, 14, 32);
  doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 38);
  doc.text(`Total Records Found: ${businesses.length}`, 14, 44);
  doc.text(`Source Engine: Directory Scraper & Search Indexes`, 14, 50);

  // Table structure
  const columns = ["#", "Name", "Category", "City", "Phone", "Website", "Rating", "Reviews", "Address", "Google Maps"];
  const rows = businesses.map((b, index) => [
    index + 1,
    b.name,
    b.category,
    b.city || "",
    b.phone || "",
    b.website || "",
    b.rating ? b.rating.toString() : "-",
    b.additionalData?.review_count || b.reviewCount || "-",
    b.address || "",
    b.additionalData?.google_maps_url || b.sourceUrl || "",
  ]);

  // Generate Table using standalone function call
  // @ts-ignore
  autoTable(doc, {
    startY: 56,
    head: [columns],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [75, 103, 160],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 45 },
      6: { cellWidth: 12 },
      7: { cellWidth: 12 },
      8: { cellWidth: "auto" },
      9: { cellWidth: 45 },
    },
    didDrawPage: (data: any) => {
      // Footer page numbering
      const str = "Page " + doc.getNumberOfPages();
      doc.setFontSize(8);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    },
  });

  const safeName = command.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 40);
  doc.save(`scraper_${safeName || "export"}.pdf`);
}

/**
 * Exports business dataset to standard comma-separated-values (.csv)
 */
export function exportToCSV(businesses: Business[], command: string) {
  const headers = ["#", "Name", "Category", "Address", "Area", "City", "Country", "Phone", "Phone National", "Email", "Website", "Google Maps URL", "Rating", "Review Count", "Business Status", "Price", "Opening Hours", "Source", "Latitude", "Longitude"];

  const csvRows = [
    headers.join(","),
    ...businesses.map((b, idx) => {
      const vals = [
        idx + 1,
        b.name,
        b.category,
        b.address || "",
        b.area || "",
        b.city || "",
        b.country || "",
        b.phone || "",
        b.additionalData?.phone_national || "",
        b.email || "",
        b.website || "",
        b.additionalData?.google_maps_url || b.sourceUrl || "",
        b.rating || "",
        b.additionalData?.review_count || b.reviewCount || "",
        b.additionalData?.business_status || "",
        b.price || "",
        b.openingHours || "",
        b.source,
        b.latitude || "",
        b.longitude || "",
      ];
      // Escape commas and quotes inside fields
      return vals
        .map((v) => {
          const str = String(v).replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        })
        .join(",");
    }),
  ];

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const safeName = command.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 40);
  link.setAttribute("download", `scraper_${safeName || "export"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
