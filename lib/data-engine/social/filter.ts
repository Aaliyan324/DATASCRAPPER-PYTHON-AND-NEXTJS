// ─────────────────────────────────────────────────────────────────
// Social Media Intelligence — Filtering
// Applies social criteria filters to business results.
// ─────────────────────────────────────────────────────────────────

import { SocialProfiles, SocialSearchCriteria, SocialPlatform } from "./types";

/**
 * Apply social filter criteria to a business's social profiles.
 * Returns true if the business passes all social filters.
 */
export function applySocialFilter(
  profiles: SocialProfiles | null | undefined,
  criteria: SocialSearchCriteria
): boolean {
  // If no social data and social is required, reject
  if (!profiles && criteria.socialRequired) {
    return false;
  }

  if (!profiles) return true; // No social criteria to check

  // Filter: must have at least one social profile
  if (criteria.hasSocialProfile === true) {
    const hasAny = Object.values(profiles).some(
      (p) => p !== null && p.status === "FOUND" && p.url !== null
    );
    if (!hasAny) return false;
  }

  // Filter: specific platform
  if (criteria.platform) {
    const platformProfile = profiles[criteria.platform];
    if (!platformProfile || platformProfile.status !== "FOUND") {
      return false;
    }
  }

  // Filter: follower count
  if (criteria.followerFilter) {
    const { operator, value } = criteria.followerFilter;
    const targetPlatform = criteria.platform || "instagram";
    const profile = profiles[targetPlatform as SocialPlatform];

    if (!profile || profile.followers === null) {
      return false; // Can't verify follower count without data
    }

    if (!compareValue(profile.followers, operator, value)) {
      return false;
    }
  }

  // Filter: post count
  if (criteria.postFilter) {
    const { operator, value } = criteria.postFilter;
    const targetPlatform = criteria.platform || "instagram";
    const profile = profiles[targetPlatform as SocialPlatform];

    if (!profile || profile.posts === null) {
      return false;
    }

    if (!compareValue(profile.posts, operator, value)) {
      return false;
    }
  }

  // Filter: confidence threshold
  if (criteria.confidenceFilter) {
    const { operator, value } = criteria.confidenceFilter;
    const targetPlatform = criteria.platform || "instagram";
    const profile = profiles[targetPlatform as SocialPlatform];

    if (!profile) return false;

    if (!compareValue(profile.confidence, operator, value)) {
      return false;
    }
  }

  return true;
}

function compareValue(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case "gt": return actual > target;
    case "lt": return actual < target;
    case "gte": return actual >= target;
    case "lte": return actual <= target;
    case "eq": return actual === target;
    default: return true;
  }
}
