import { PlaceRecord } from "../data-engine/types";

// ─── Business Record (extended for deduplication) ────────────────────────────

export interface BusinessRecord {
  id?: string;
  name: string;
  category?: string;

  address?: string;
  area?: string;
  city?: string;
  district?: string;
  province?: string;
  country: string;

  phone?: string;
  phones?: string[];

  website?: string;
  websites?: string[];

  latitude?: number;
  longitude?: number;

  placeId?: string;

  rating?: number;
  reviewCount?: number;

  // Deduplication metadata
  duplicateGroupId?: string;
  mergedRecordCount?: number;
  mergedFrom?: string[];

  duplicateScore?: number;
  deduplicationReason?: string[];

  dataCompleteness?: number;
  confidenceScore?: number;

  // Source tracking
  source?: string;
  googleMapsUrl?: string;
  businessStatus?: string;

  // Original PlaceRecord reference (not exported, used internally)
  _original?: PlaceRecord;
}

// ─── Duplicate Group ─────────────────────────────────────────────────────────

export interface DuplicateGroup {
  groupId: string;
  masterRecordId: string;
  records: BusinessRecord[];
  duplicateScore: number;
  reason: string[];
}

// ─── Deduplication Result ────────────────────────────────────────────────────

export interface DeduplicationResult {
  uniqueBusinesses: BusinessRecord[];
  duplicateGroups: DuplicateGroup[];
  rawCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
  duplicateGroupCount: number;
}

// ─── Duplicate Pair Debug ────────────────────────────────────────────────────

export interface DuplicatePairDebug {
  businessA: string;
  businessB: string;
  nameSimilarity: number;
  phoneSimilarity: number;
  websiteSimilarity: number;
  addressSimilarity: number;
  geographicDistance: number | null;
  categorySimilarity: number;
  duplicateScore: number;
  decision: "MERGED" | "KEEP_SEPARATE";
  reasons: string[];
}

// ─── Export Types ────────────────────────────────────────────────────────────

export type ExportScope =
  | "current"
  | "area"
  | "multiple_areas"
  | "entire_search"
  | "all"
  | "selected";

export type ExportFormat = "xlsx" | "pdf";

export interface ExportFilters {
  category?: string;
  minRating?: number;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  areas?: string[];
}

export interface ExportConfig {
  businesses: BusinessRecord[];
  duplicateGroups: DuplicateGroup[];
  scope: ExportScope;
  areas?: string[];
  selectedIds?: string[];
  filters?: ExportFilters;
  format: ExportFormat;
  searchQuery?: string;
  onProgress?: (step: string, pct: number) => void;
}

export interface ExportSummary {
  scope: string;
  selectedAreas: string[];
  rawCount: number;
  duplicatesRemoved: number;
  uniqueCount: number;
  filteredCount: number;
  activeFilters: string[];
}

// ─── Scoring Signals ─────────────────────────────────────────────────────────

export interface ScoringSignals {
  nameSimilarity: number;
  phoneSimilarity: number;
  websiteSimilarity: number;
  addressSimilarity: number;
  geographicScore: number;
  geographicDistance: number | null;
  categorySimilarity: number;
}

export interface ScoringResult {
  score: number;
  reasons: string[];
  signals: ScoringSignals;
}

// ─── Blocking Key ────────────────────────────────────────────────────────────

export interface BlockingIndex {
  phoneIndex: Map<string, number[]>;
  domainIndex: Map<string, number[]>;
  cityIndex: Map<string, number[]>;
  geohashIndex: Map<string, number[]>;
  nameTokenIndex: Map<string, number[]>;
  categoryIndex: Map<string, number[]>;
}
