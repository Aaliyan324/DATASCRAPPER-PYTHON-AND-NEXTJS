// ─────────────────────────────────────────────────────────────────
// Social Media Intelligence — Type Definitions
// Pakistan Business Data Engine — Social Discovery Layer
// ─────────────────────────────────────────────────────────────────

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube";

export type SocialSourceType = "official_api" | "website" | "search" | "manual" | null;

export type SocialDiscoveryStatus =
  | "FOUND"
  | "NOT_FOUND"
  | "VERIFICATION_FAILED"
  | "API_UNAVAILABLE"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "TIMEOUT"
  | "ERROR"
  | "PENDING"
  | "CACHE_HIT";

export interface SocialProfile {
  platform: SocialPlatform;
  url: string | null;
  username: string | null;

  // Metrics — nullable, never fabricated
  followers: number | null;
  following: number | null;
  posts: number | null;
  videos: number | null;
  likes: number | null;

  verified: boolean | null;

  // Provenance
  source: string | null;
  sourceType: SocialSourceType;
  confidence: number;
  matchReasons: string[];

  lastChecked: string | null;
  status: SocialDiscoveryStatus;
}

export interface SocialProfiles {
  instagram: SocialProfile | null;
  facebook: SocialProfile | null;
  tiktok: SocialProfile | null;
  linkedin: SocialProfile | null;
  youtube: SocialProfile | null;
}

export interface SocialCandidate {
  platform: SocialPlatform;
  url: string;
  username: string | null;
  sourceType: SocialSourceType;
  source: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  displayName?: string | null;
}

export interface SocialVerificationResult {
  isMatch: boolean;
  confidence: number;
  reasons: string[];
}

export interface SocialMetrics {
  followers: number | null;
  following: number | null;
  posts: number | null;
  videos: number | null;
  likes: number | null;
  verified: boolean | null;
}

export interface SocialSearchCriteria {
  platform?: SocialPlatform | null;
  socialRequired?: boolean;
  followerFilter?: {
    operator: "gt" | "lt" | "gte" | "lte" | "eq";
    value: number;
  } | null;
  postFilter?: {
    operator: "gt" | "lt" | "gte" | "lte" | "eq";
    value: number;
  } | null;
  confidenceFilter?: {
    operator: "gt" | "lt" | "gte" | "lte" | "eq";
    value: number;
  } | null;
  hasSocialProfile?: boolean | null;
}

export interface SocialProvider {
  readonly platform: SocialPlatform;
  findProfile(businessName: string, city: string, area?: string | null): Promise<SocialCandidate | null>;
  getMetrics(username: string, url: string): Promise<SocialMetrics | null>;
}

export interface SocialEnrichmentResult {
  businessId: string;
  placeId: string | null;
  profiles: SocialProfiles;
  enrichedAt: string;
  overallStatus: SocialDiscoveryStatus;
}

export interface SocialCacheEntry {
  placeId: string;
  profiles: SocialProfiles;
  cachedAt: string;
  expiresAt: string;
}
