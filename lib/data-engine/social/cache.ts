// ─────────────────────────────────────────────────────────────────
// Social Media Intelligence — In-Memory Cache
// Uses Google Place ID as the primary cache key.
// ─────────────────────────────────────────────────────────────────

import { SocialProfiles, SocialCacheEntry } from "./types";
import { getSocialConfig } from "./config";

const cache = new Map<string, SocialCacheEntry>();

/**
 * Get cached social profiles for a place ID, if still fresh.
 */
export function getCachedSocial(placeId: string): SocialProfiles | null {
  if (!placeId) return null;

  const entry = cache.get(placeId);
  if (!entry) return null;

  const now = Date.now();
  const expiresAt = new Date(entry.expiresAt).getTime();

  if (now > expiresAt) {
    cache.delete(placeId);
    console.log(`[Social] Cache expired for place ${placeId}`);
    return null;
  }

  console.log(`[Social] Cache hit for place ${placeId}`);
  return entry.profiles;
}

/**
 * Store social profiles in cache for a place ID.
 */
export function setCachedSocial(placeId: string, profiles: SocialProfiles): void {
  if (!placeId) return;

  const config = getSocialConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.cacheTTL * 1000);

  cache.set(placeId, {
    placeId,
    profiles,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  console.log(`[Social] Cached social data for place ${placeId} (TTL: ${config.cacheTTL}s)`);
}

/**
 * Check if a place has been cached recently.
 */
export function isSocialCached(placeId: string): boolean {
  return getCachedSocial(placeId) !== null;
}

/**
 * Clear all cached social data.
 */
export function clearSocialCache(): void {
  cache.clear();
  console.log("[Social] Cache cleared");
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}
