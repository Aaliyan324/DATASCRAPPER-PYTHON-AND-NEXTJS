// ─────────────────────────────────────────────────────────────────
// Social Media Intelligence — Configuration
// All values configurable via environment variables
// ─────────────────────────────────────────────────────────────────

export interface SocialConfig {
  enabled: boolean;
  confidenceThreshold: number;
  cacheTTL: number; // seconds
  maxConcurrency: number;
  requestTimeout: number; // ms
  maxRetries: number;
}

export function getSocialConfig(): SocialConfig {
  return {
    enabled: process.env.SOCIAL_ENABLED !== "false",
    confidenceThreshold: parseFloat(process.env.SOCIAL_CONFIDENCE_THRESHOLD || "0.70"),
    cacheTTL: parseInt(process.env.SOCIAL_CACHE_TTL || "604800", 10), // 7 days default
    maxConcurrency: parseInt(process.env.SOCIAL_MAX_CONCURRENCY || "3", 10),
    requestTimeout: parseInt(process.env.SOCIAL_REQUEST_TIMEOUT || "10000", 10),
    maxRetries: parseInt(process.env.SOCIAL_MAX_RETRIES || "2", 10),
  };
}

// Platform-specific domain patterns for link detection
export const SOCIAL_DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  instagram: [
    /(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i,
    /(?:www\.)?instagr\.am\/([A-Za-z0-9_.]+)/i,
  ],
  facebook: [
    /(?:www\.)?facebook\.com\/([A-Za-z0-9_.]+)/i,
    /(?:www\.)?fb\.com\/([A-Za-z0-9_.]+)/i,
    /(?:www\.)?fb\.me\/([A-Za-z0-9_.]+)/i,
  ],
  tiktok: [
    /(?:www\.)?tiktok\.com\/@([A-Za-z0-9_.]+)/i,
    /(?:vm\.)?tiktok\.com\/([A-Za-z0-9_.]+)/i,
  ],
  linkedin: [
    /(?:www\.)?linkedin\.com\/company\/([A-Za-z0-9_.-]+)/i,
    /(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_.-]+)/i,
  ],
  youtube: [
    /(?:www\.)?youtube\.com\/@([A-Za-z0-9_.-]+)/i,
    /(?:www\.)?youtube\.com\/c\/([A-Za-z0-9_.-]+)/i,
    /(?:www\.)?youtube\.com\/channel\/([A-Za-z0-9_.-]+)/i,
    /(?:www\.)?youtube\.com\/user\/([A-Za-z0-9_.-]+)/i,
    /(?:www\.)?youtu\.be\/([A-Za-z0-9_.-]+)/i,
  ],
};

// Normalize social URLs to canonical form
export function normalizeSocialUrl(url: string, platform: string): { url: string; username: string | null } {
  try {
    const cleaned = url.trim().replace(/\/+$/, "");
    // Validate URL format (throws if invalid)
    new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);

    let username: string | null = null;

    switch (platform) {
      case "instagram": {
        const match = cleaned.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
        username = match?.[1] || null;
        if (username) {
          return { url: `https://www.instagram.com/${username}/`, username };
        }
        break;
      }
      case "facebook": {
        const match = cleaned.match(/(?:facebook|fb)\.com\/([A-Za-z0-9_.]+)/i);
        username = match?.[1] || null;
        if (username && !["pages", "profile", "groups", "events", "watch", "marketplace", "gaming"].includes(username.toLowerCase())) {
          return { url: `https://www.facebook.com/${username}/`, username };
        }
        break;
      }
      case "tiktok": {
        const match = cleaned.match(/tiktok\.com\/@?([A-Za-z0-9_.]+)/i);
        username = match?.[1] || null;
        if (username && !["explore", "trending", "following", "foryou"].includes(username.toLowerCase())) {
          return { url: `https://www.tiktok.com/@${username}`, username };
        }
        break;
      }
      case "linkedin": {
        const companyMatch = cleaned.match(/linkedin\.com\/company\/([A-Za-z0-9_.-]+)/i);
        const profileMatch = cleaned.match(/linkedin\.com\/in\/([A-Za-z0-9_.-]+)/i);
        if (companyMatch) {
          username = companyMatch[1];
          return { url: `https://www.linkedin.com/company/${username}`, username };
        }
        if (profileMatch) {
          username = profileMatch[1];
          return { url: `https://www.linkedin.com/in/${username}`, username };
        }
        break;
      }
      case "youtube": {
        const handleMatch = cleaned.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/i);
        const channelMatch = cleaned.match(/youtube\.com\/channel\/([A-Za-z0-9_.-]+)/i);
        const userMatch = cleaned.match(/youtube\.com\/(?:c\/|user\/)([A-Za-z0-9_.-]+)/i);
        if (handleMatch) {
          username = handleMatch[1];
          return { url: `https://www.youtube.com/@${username}`, username };
        }
        if (channelMatch) {
          username = channelMatch[1];
          return { url: `https://www.youtube.com/channel/${username}`, username };
        }
        if (userMatch) {
          username = userMatch[1];
          return { url: `https://www.youtube.com/user/${username}`, username };
        }
        break;
      }
    }

    return { url: cleaned, username };
  } catch {
    return { url, username: null };
  }
}

// Format follower counts for display (e.g., 18400 → "18.4K")
export function formatSocialCount(count: number | null): string {
  if (count === null || count === undefined) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}
