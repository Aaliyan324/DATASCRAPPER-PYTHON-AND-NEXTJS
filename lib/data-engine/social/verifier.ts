// ─────────────────────────────────────────────────────────────────
// Social Profile Verification
// Uses heuristic matching + optional Gemini AI verification
// to determine if a candidate social profile belongs to a business.
// ─────────────────────────────────────────────────────────────────

import { SocialCandidate, SocialVerificationResult, SocialProfile, SocialPlatform } from "./types";
import { getSocialConfig } from "./config";
import { PlaceRecord } from "../types";

/**
 * Verify a social candidate against business data using heuristic scoring.
 * This is the primary verification — fast, deterministic, no API cost.
 */
export function verifyProfileHeuristic(
  candidate: SocialCandidate,
  business: PlaceRecord
): SocialVerificationResult {
  const reasons: string[] = [];
  let score = 0;

  const bizName = (business.business_name || "").toLowerCase().trim();
  const bizCity = (business.city || "").toLowerCase().trim();
  const bizArea = (business.area || "").toLowerCase().trim();
  const bizPhone = (business.phone || "").replace(/\D/g, "");
  const bizWebsite = (business.website || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const username = (candidate.username || "").toLowerCase();
  const profileWebsite = (candidate.website || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const profileBio = (candidate.bio || "").toLowerCase();
  const profileLocation = (candidate.location || "").toLowerCase();
  const profileDisplayName = (candidate.displayName || "").toLowerCase();

  // 1. Username contains business name or significant part of it
  const bizNameWords = bizName.split(/\s+/).filter(w => w.length > 2);
  const bizNameMain = bizNameWords[0] || "";

  if (username.includes(bizName.replace(/\s+/g, "")) || username.includes(bizName.replace(/\s+/g, "").replace(/[^a-z0-9]/g, ""))) {
    score += 0.35;
    reasons.push("Username matches business name exactly");
  } else if (bizNameMain && username.includes(bizNameMain)) {
    score += 0.2;
    reasons.push(`Username contains business name keyword "${bizNameMain}"`);
  }

  // 2. Display name matches business name
  if (profileDisplayName) {
    if (profileDisplayName.includes(bizName) || bizName.includes(profileDisplayName)) {
      score += 0.25;
      reasons.push("Profile display name matches business name");
    } else {
      const displayNameWords = profileDisplayName.split(/\s+/);
      const overlap = displayNameWords.filter(w => bizNameWords.includes(w));
      if (overlap.length >= 2) {
        score += 0.15;
        reasons.push(`Profile display name shares ${overlap.length} words with business name`);
      }
    }
  }

  // 3. Profile website matches business website
  if (bizWebsite && profileWebsite) {
    if (bizWebsite === profileWebsite || bizWebsite.includes(profileWebsite) || profileWebsite.includes(bizWebsite)) {
      score += 0.3;
      reasons.push("Profile website matches business website");
    }
  }

  // 4. Profile bio mentions city or area
  if (profileBio) {
    if (bizCity && profileBio.includes(bizCity)) {
      score += 0.1;
      reasons.push(`Profile bio mentions ${bizCity}`);
    }
    if (bizArea && profileBio.includes(bizArea)) {
      score += 0.05;
      reasons.push(`Profile bio mentions ${bizArea}`);
    }
    if (profileBio.includes("pakistan") || profileBio.includes("pk")) {
      score += 0.05;
      reasons.push("Profile bio mentions Pakistan");
    }
  }

  // 5. Profile location matches business city
  if (profileLocation) {
    if (bizCity && profileLocation.includes(bizCity)) {
      score += 0.15;
      reasons.push(`Profile location matches ${bizCity}`);
    }
    if (bizArea && profileLocation.includes(bizArea)) {
      score += 0.1;
      reasons.push(`Profile location matches ${bizArea}`);
    }
  }

  // 6. Business phone in profile (rare but strong signal)
  if (bizPhone && bizPhone.length >= 8) {
    const phoneLast4 = bizPhone.slice(-4);
    if (profileBio.includes(phoneLast4) || profileWebsite.includes(phoneLast4)) {
      score += 0.1;
      reasons.push("Phone number fragment found in profile");
    }
  }

  // 7. Source from official website (very strong signal)
  if (candidate.sourceType === "website") {
    score += 0.2;
    reasons.push("Profile found on business's official website");
  }

  // 8. Penalize if location clearly mismatches
  if (profileLocation && bizCity) {
    const otherCities = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar"];
    const profileHasOtherCity = otherCities.some(c => c !== bizCity && profileLocation.includes(c));
    if (profileHasOtherCity && !profileLocation.includes(bizCity)) {
      score -= 0.3;
      reasons.push("Profile location suggests different city");
    }
  }

  // Cap score between 0 and 1
  score = Math.max(0, Math.min(1, score));

  return {
    isMatch: score >= getSocialConfig().confidenceThreshold,
    confidence: Math.round(score * 100) / 100,
    reasons,
  };
}

/**
 * Verify a social candidate using Gemini AI for nuanced matching.
 * Used as a secondary check when heuristic is inconclusive (0.5–0.85 range).
 */
export async function verifyProfileWithGemini(
  candidate: SocialCandidate,
  business: PlaceRecord
): Promise<SocialVerificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fall back to heuristic only
    return verifyProfileHeuristic(candidate, business);
  }

  try {
    const prompt = `You are a business identity verification expert. Determine if this social media profile belongs to the given business.

BUSINESS:
- Name: ${business.business_name}
- Category: ${business.category}
- Address: ${business.address || "Unknown"}
- Area: ${business.area || "Unknown"}
- City: ${business.city || "Unknown"}
- Phone: ${business.phone || "Unknown"}
- Website: ${business.website || "Unknown"}

CANDIDATE SOCIAL PROFILE:
- Platform: ${candidate.platform}
- URL: ${candidate.url}
- Username: ${candidate.username || "Unknown"}
- Bio: ${candidate.bio || "Not available"}
- Location: ${candidate.location || "Not available"}
- Website: ${candidate.website || "Not available"}
- Display Name: ${candidate.displayName || "Not available"}

Rules:
- This is a Pakistan-focused business. Pakistani businesses may have informal social media presence.
- Common names exist (e.g., "Al-Madina Restaurant" exists in many cities). Location matters.
- Do NOT match fan pages, review pages, or employee accounts.
- If the profile clearly belongs to a different city or country, reject it.

Return JSON: {"isMatch": boolean, "confidence": number (0-1), "reasons": string[]}`;

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      console.log(`[Social] Gemini verification failed: ${response.status}`);
      return verifyProfileHeuristic(candidate, business);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return verifyProfileHeuristic(candidate, business);
    }

    const result = JSON.parse(textResult) as SocialVerificationResult;

    // Validate Gemini output — it must NOT invent metrics
    if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1) {
      return verifyProfileHeuristic(candidate, business);
    }

    return result;
  } catch (err) {
    console.error("[Social] Gemini verification error:", err);
    return verifyProfileHeuristic(candidate, business);
  }
}

/**
 * Build a verified SocialProfile from a candidate + verification result.
 */
export function buildVerifiedProfile(
  candidate: SocialCandidate,
  verification: SocialVerificationResult
): SocialProfile {
  const now = new Date().toISOString();
  return {
    platform: candidate.platform,
    url: candidate.url,
    username: candidate.username,
    followers: null, // Metrics obtained separately
    following: null,
    posts: null,
    videos: null,
    likes: null,
    verified: null,
    source: candidate.source || null,
    sourceType: candidate.sourceType,
    confidence: verification.confidence,
    matchReasons: verification.reasons,
    lastChecked: now,
    status: verification.isMatch ? "FOUND" : "VERIFICATION_FAILED",
  };
}

/**
 * Create an empty profile for a platform that was searched but not found.
 */
export function createNotFoundProfile(platform: SocialPlatform): SocialProfile {
  return {
    platform,
    url: null,
    username: null,
    followers: null,
    following: null,
    posts: null,
    videos: null,
    likes: null,
    verified: null,
    source: null,
    sourceType: null,
    confidence: 0,
    matchReasons: [],
    lastChecked: new Date().toISOString(),
    status: "NOT_FOUND",
  };
}
