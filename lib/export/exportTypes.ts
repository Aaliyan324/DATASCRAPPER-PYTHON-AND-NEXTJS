/**
 * Export-specific types.
 * Core types (BusinessRecord, DuplicateGroup, ExportScope, etc.) are in ../deduplication/types.ts.
 */

export type {
  BusinessRecord,
  DuplicateGroup,
  ExportScope,
  ExportFormat,
  ExportFilters,
  ExportConfig,
  ExportSummary,
} from "../deduplication/types";

export interface ExportProgress {
  step: string;
  percentage: number;
}

export interface ExportFileResult {
  filename: string;
  format: "xlsx" | "pdf";
  blob?: Blob;
  dataUrl?: string;
}
