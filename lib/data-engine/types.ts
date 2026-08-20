export type JobStatus = "PENDING" | "PARSING" | "SCRAPING" | "COMPLETED" | "ERROR" | "QUEUED" | "FAILED";

export interface Location {
  country: string;
  province?: string | null;
  division?: string | null;
  district?: string | null;
  tehsil?: string | null;
  city?: string | null;
  town?: string | null;
  union_council?: string | null;
  locality?: string | null;
  neighborhood?: string | null;
  village?: string | null;
  mouza?: string | null;
  colony?: string | null;
  basti?: string | null;
  housing_society?: string | null;
  phase?: string | null;
  sector?: string | null;
  block?: string | null;
  market?: string | null;
  bazaar?: string | null;
  chowk?: string | null;
  road?: string | null;
  landmark?: string | null;

  // Coordinates
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;

  // Classification
  location_type?: string | null;
  confidence: number;
  confident: boolean;
  confidence_note?: string | null;

  // Search modifiers
  preposition: "in" | "inside" | "near" | "around";
  distance_meters?: number | null;
}

export type FieldName =
  | "business_name"
  | "category"
  | "address"
  | "area"
  | "phone"
  | "website"
  | "google_maps_url"
  | "latitude"
  | "longitude"
  | "rating"
  | "review_count"
  | "opening_hours"
  | "business_status";

export interface SearchPlan {
  category: string;
  location: Location;
  filters: Record<string, string>;
  fields: FieldName[];
  requested_result_count?: number | null;
  export_format?: "excel" | "pdf" | "both" | null;
  original_query: string;
  debug_info?: Record<string, any> | null;
}

export interface PlaceRecord {
  place_id?: string | null;
  business_name?: string | null;
  category?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  country: string;
  phone?: string | null;
  phone_national?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  review_count?: number | null;
  business_status?: string | null;
  source: string;
  retrieved_at?: string | null;
  // Geographic validation fields
  distance_km?: number | null;
  location_match_score?: number | null;
}
