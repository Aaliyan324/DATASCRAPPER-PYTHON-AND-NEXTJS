// ─────────────────────────────────────────────────────────────────
// Website Social Link Extractor
// Fetches a business website and extracts social media links from:
// - HTML anchor tags
// - JSON-LD structured data (sameAs)
// - OpenGraph metadata
// - Organization schema
// ─────────────────────────────────────────────────────────────────

import { SocialCandidate, SocialPlatform } from "./types";
import { SOCIAL_DOMAIN_PATTERNS, normalizeSocialUrl } from "./config";

const PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "tiktok", "linkedin", "youtube"];

// Paths that are unlikely to be official business profiles
const EXCLUDED_PATHS = [
  "login", "signup", "register", "auth", "oauth", "share", "share.php",
  "sharer", "plugins", "dialog", "story", "reel", "p",
];

/**
 * Extracts social media links from a business website HTML.
 */
export async function extractSocialFromWebsite(
  websiteUrl: string,
): Promise<SocialCandidate[]> {
  const candidates: SocialCandidate[] = [];
  const seenUrls = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AetherBot/1.0; +https://aether.ai)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[Social] Website ${websiteUrl} returned ${response.status}`);
      return candidates;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return candidates;
    }

    const html = await response.text();

    // 1. Extract from JSON-LD structured data (highest confidence)
    const jsonLdCandidates = extractFromJsonLd(html);
    for (const c of jsonLdCandidates) {
      const key = c.url.toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        candidates.push({ ...c, sourceType: "website" as const, source: websiteUrl });
      }
    }

    // 2. Extract from OpenGraph metadata
    const ogCandidates = extractFromOpenGraph(html);
    for (const c of ogCandidates) {
      const key = c.url.toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        candidates.push({ ...c, sourceType: "website" as const, source: websiteUrl });
      }
    }

    // 3. Extract from HTML anchor tags
    const htmlCandidates = extractFromAnchors(html);
    for (const c of htmlCandidates) {
      const key = c.url.toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        candidates.push({ ...c, sourceType: "website" as const, source: websiteUrl });
      }
    }

    console.log(`[Social] Extracted ${candidates.length} social links from ${websiteUrl}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Social] Failed to fetch website ${websiteUrl}: ${msg}`);
  }

  return candidates;
}

/**
 * Extract social links from JSON-LD structured data blocks.
 */
function extractFromJsonLd(html: string): SocialCandidate[] {
  const candidates: SocialCandidate[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const data = JSON.parse(jsonStr);
      extractSameAsFromJson(data, candidates);
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return candidates;
}

/**
 * Recursively search JSON-LD data for sameAs fields.
 */
function extractSameAsFromJson(data: unknown, candidates: SocialCandidate[]): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      extractSameAsFromJson(item, candidates);
    }
    return;
  }

  const obj = data as Record<string, unknown>;

  // Check for sameAs field
  if (obj.sameAs) {
    const urls = Array.isArray(obj.sameAs) ? obj.sameAs : [obj.sameAs];
    for (const url of urls) {
      if (typeof url === "string") {
        const candidate = matchUrlToPlatform(url);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }
  }

  // Recurse into nested objects
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      extractSameAsFromJson(value, candidates);
    }
  }
}

/**
 * Extract social links from OpenGraph meta tags.
 */
function extractFromOpenGraph(html: string): SocialCandidate[] {
  const candidates: SocialCandidate[] = [];

  // Look for og:see_also or article:author meta tags
  const ogPatterns = [
    /<meta[^>]*property=["']og:see_also["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]*name=["'](?:instagram|facebook|tiktok|twitter|linkedin|youtube)["'][^>]*content=["']([^"']+)["']/gi,
  ];

  for (const pattern of ogPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      const candidate = matchUrlToPlatform(url);
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}

/**
 * Extract social links from HTML anchor tags.
 * Focuses on header, footer, nav, contact sections, and social icon areas.
 */
function extractFromAnchors(html: string): SocialCandidate[] {
  const candidates: SocialCandidate[] = [];

  // Find all anchor tags with href attributes
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      continue;
    }

    const candidate = matchUrlToPlatform(href);
    if (candidate) {
      // Check if the path is an excluded path (not a real profile)
      const urlPath = new URL(candidate.url).pathname.toLowerCase();
      const isExcluded = EXCLUDED_PATHS.some(p => urlPath.includes(`/${p}`));
      if (!isExcluded) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}

/**
 * Match a URL against known social platform patterns.
 */
function matchUrlToPlatform(url: string): SocialCandidate | null {
  for (const platform of PLATFORMS) {
    const patterns = SOCIAL_DOMAIN_PATTERNS[platform];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const normalized = normalizeSocialUrl(url, platform);
        if (normalized.username) {
          return {
            platform,
            url: normalized.url,
            username: normalized.username,
            sourceType: "website",
            source: null,
          };
        }
      }
    }
  }
  return null;
}
