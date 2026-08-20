import { SearchPlan, PlaceRecord } from "./types";

/**
 * Normalizes phone numbers to standard Pakistani international format: +923XXXXXXXXX
 */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  
  // Remove all non-digit and non-plus characters
  let s = value.replace(/[^\d+]/g, "");
  
  if (s.startsWith("0092")) {
    s = "+" + s.substring(2);
  } else if (s.startsWith("92") && !s.startsWith("+")) {
    s = "+" + s;
  } else if (s.startsWith("03") && s.length >= 10) {
    s = "+92" + s.substring(1);
  } else if (s.startsWith("0") && s.length >= 10) {
    // Landline: e.g. 0421234567 -> +92421234567
    s = "+92" + s.substring(1);
  }
  
  return s.startsWith("+") ? s : null;
}

/**
 * Normalizes phone numbers to standard Pakistani national format: 03XXXXXXXXX
 */
export function normalizePhoneNational(value: string | null | undefined): string | null {
  const international = normalizePhone(value);
  if (!international) return null;
  
  if (international.startsWith("+92")) {
    return "0" + international.substring(3);
  }
  return international;
}

/**
 * Normalizes website URLs to a standard comparison format.
 */
export function normalizeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  
  if (!/^https?:\/\//i.test(cleaned)) {
    return "https://" + cleaned;
  }
  return cleaned;
}

/**
 * Normalizes a website to its base domain for deduplication.
 * e.g., "https://www.savourfoods.com.pk/location/" -> "savourfoods.com.pk"
 */
export function normalizeWebsiteDomain(url: string | null | undefined): string {
  if (!url) return "";
  try {
    let clean = url.trim().toLowerCase();
    // Remove protocol
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/i, "");
    // Remove paths and query params
    clean = clean.split("/")[0].split("?")[0];
    return clean;
  } catch (e) {
    return "";
  }
}

/**
 * Normalizes text spacing.
 */
export function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Cleans a business name by removing common suffix abbreviations for fuzzy comparison.
 */
export function cleanBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // normalize spaces
    .replace(/\b(pvt|ltd|limited|private|inc|co|company|group|restaurant|cafe|school|hotel|agency|realtors)\b/g, "")
    .trim();
}

/**
 * Map raw Places API New JSON fields to TypeScript PlaceRecord.
 */
export function normalizePlace(raw: any, plan: SearchPlan, retrievedAt?: string): PlaceRecord {
  const display = raw.displayName || {};
  const location = raw.location || {};
  const address = normalizeText(raw.formattedAddress);
  
  // Best effort area extraction
  let area: string | null = null;
  if (address) {
    const parts = address.split(",").map((p: string) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      area = parts[parts.length - 3];
    }
  }

  const rawPhone = raw.nationalPhoneNumber || raw.internationalPhoneNumber;
  const lat = location.latitude ?? null;
  const lng = location.longitude ?? null;

  return {
    place_id: raw.id,
    business_name: normalizeText(display.text),
    category: plan.category,
    address,
    area,
    city: plan.location.city,
    district: plan.location.district,
    province: plan.location.province,
    country: "Pakistan",
    phone: normalizePhone(rawPhone),
    phone_national: normalizePhoneNational(rawPhone),
    website: normalizeWebsite(raw.websiteUri),
    google_maps_url: raw.googleMapsUri,
    latitude: lat,
    longitude: lng,
    rating: raw.rating ?? null,
    review_count: raw.userRatingCount ?? null,
    business_status: raw.businessStatus ?? null,
    source: "Google Places API (New)",
    retrieved_at: retrievedAt || new Date().toISOString()
  };
}
