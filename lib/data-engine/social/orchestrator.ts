// ─────────────────────────────────────────────────────────────────
// Social Media Intelligence — Main Orchestrator
// Coordinates the full social discovery pipeline:
// 1. Website extraction
// 2. Candidate verification (heuristic + optional Gemini)
// 3. Caching
// 4. Rate limiting / concurrency control
// ─────────────────────────────────────────────────────────────────

import { PlaceRecord } from "../types";
import {
  SocialProfiles,
  SocialPlatform,
  SocialDiscoveryStatus,
  SocialEnrichmentResult,
} from "./types";
import { getSocialConfig } from "./config";
import { extractSocialFromWebsite } from "./website-extractor";
import { verifyProfileHeuristic, verifyProfileWithGemini, buildVerifiedProfile, createNotFoundProfile } from "./verifier";
import { getCachedSocial, setCachedSocial } from "./cache";

const ALL_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "tiktok", "linkedin", "youtube"];

// Concurrency semaphore
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const config = getSocialConfig();

  while (activeRequests >= config.maxConcurrency) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  }

  activeRequests++;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

    const result = await fn();
    clearTimeout(timeout);
    return result;
  } finally {
    activeRequests--;
    if (requestQueue.length > 0) {
      const next = requestQueue.shift();
      if (next) next();
    }
  }
}

/**
 * Enrich a single business with social media data.
 */
async function enrichBusiness(
  business: PlaceRecord,
): Promise<SocialEnrichmentResult> {
  const config = getSocialConfig();
  const placeId = business.place_id || "";
  const now = new Date().toISOString();

  const emptyProfiles: SocialProfiles = {
    instagram: null,
    facebook: null,
    tiktok: null,
    linkedin: null,
    youtube: null,
  };

  const result: SocialEnrichmentResult = {
    businessId: business.place_id || "",
    placeId,
    profiles: { ...emptyProfiles },
    enrichedAt: now,
    overallStatus: "NOT_FOUND",
  };

  if (!config.enabled) {
    result.overallStatus = "API_UNAVAILABLE";
    return result;
  }

  // 1. Check cache first
  if (placeId) {
    const cached = getCachedSocial(placeId);
    if (cached) {
      result.profiles = cached;
      result.overallStatus = "CACHE_HIT";
      return result;
    }
  }

  const bizName = business.business_name || "Unknown";
  const bizCity = business.city || "";
  const bizWebsite = business.website || null;

  console.log(`[Social] Enriching: ${bizName}, ${bizCity}`);

  const foundProfiles: Partial<SocialProfiles> = {};
  let anyFound = false;

  // 2. Website extraction (highest confidence source)
  if (bizWebsite) {
    try {
      const websiteCandidates = await withRateLimit(() =>
        extractSocialFromWebsite(bizWebsite)
      );

      for (const candidate of websiteCandidates) {
        const platform = candidate.platform;

        // Skip if we already have a high-confidence profile for this platform
        if (foundProfiles[platform] && (foundProfiles[platform]!.confidence >= 0.85)) {
          continue;
        }

        // Verify the candidate
        let verification = verifyProfileHeuristic(candidate, business);

        // If heuristic is inconclusive, try Gemini
        if (verification.confidence >= 0.5 && verification.confidence < 0.85) {
          verification = await withRateLimit(() =>
            verifyProfileWithGemini(candidate, business)
          );
        }

        if (verification.isMatch && verification.confidence >= config.confidenceThreshold) {
          const profile = buildVerifiedProfile(candidate, verification);
          foundProfiles[platform] = profile;
          anyFound = true;
          console.log(`[Social] ✓ ${platform} found for ${bizName}: @${candidate.username} (confidence: ${verification.confidence})`);
        }
      }
    } catch (err) {
      console.error(`[Social] Website extraction error for ${bizWebsite}:`, err);
    }
  }

  // 3. For platforms not found via website, create not-found profiles
  for (const platform of ALL_PLATFORMS) {
    if (!foundProfiles[platform]) {
      // We only mark as NOT_FOUND if we actually searched (had a website)
      // Otherwise leave as null (not attempted)
      if (bizWebsite) {
        result.profiles[platform] = createNotFoundProfile(platform);
      }
    } else {
      result.profiles[platform] = foundProfiles[platform]!;
    }
  }

  result.overallStatus = anyFound ? "FOUND" : "NOT_FOUND";

  // 4. Cache the result
  if (placeId) {
    setCachedSocial(placeId, result.profiles);
  }

  return result;
}

/**
 * Enrich multiple businesses with social media data using controlled concurrency.
 */
export async function enrichBusinessesWithSocial(
  businesses: PlaceRecord[],
  onProgress?: (completed: number, total: number, businessName: string) => void
): Promise<Map<string, SocialEnrichmentResult>> {
  const config = getSocialConfig();
  const results = new Map<string, SocialEnrichmentResult>();

  if (!config.enabled || businesses.length === 0) {
    return results;
  }

  console.log(`[Social] Starting social enrichment for ${businesses.length} businesses (concurrency: ${config.maxConcurrency})`);

  let completed = 0;

  // Process in batches with controlled concurrency
  const batchSize = config.maxConcurrency;
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    const batchPromises = batch.map((biz) =>
      enrichBusiness(biz).catch((err) => {
        console.error(`[Social] Error enriching ${biz.business_name}:`, err);
        return {
          businessId: biz.place_id || "",
          placeId: biz.place_id || null,
          profiles: {
            instagram: null,
            facebook: null,
            tiktok: null,
            linkedin: null,
            youtube: null,
          },
          enrichedAt: new Date().toISOString(),
          overallStatus: "ERROR" as SocialDiscoveryStatus,
        };
      })
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      results.set(result.businessId, result);
      completed++;
      if (onProgress) {
        const biz = businesses[i + batchResults.indexOf(result)];
        onProgress(completed, businesses.length, biz?.business_name || "Unknown");
      }
    }
  }

  const foundCount = Array.from(results.values()).filter(r => r.overallStatus === "FOUND").length;
  console.log(`[Social] Enrichment complete: ${foundCount}/${businesses.length} businesses have social profiles`);

  return results;
}
