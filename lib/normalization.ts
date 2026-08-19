/**
 * Helper utility for cleaning and normalising data to prevent duplicates
 */

/**
 * Normalises phone numbers to a comparable digits-only format, replacing country code prefixes.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  // If it starts with 92 (Pak country code), strip it or keep it standard
  if (digits.startsWith("92") && digits.length > 10) {
    digits = "0" + digits.substring(2);
  }
  
  return digits || null;
}

/**
 * Normalises website URLs to easily compare domains.
 * e.g., "https://www.savourfoods.com.pk/location/" -> "savourfoods.com.pk"
 */
export function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    let clean = url.trim().toLowerCase();
    
    // Remove protocol
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    // Remove trailing slash
    clean = clean.replace(/\/$/, "");
    // Remove query parameters
    clean = clean.split("?")[0];
    
    return clean || null;
  } catch (e) {
    return null;
  }
}

/**
 * Cleans a business name by removing punctuation and common trailing words
 * for fuzzy name comparisons.
 */
export function cleanBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // normalise spaces
    .replace(/\b(pvt|ltd|limited|private|inc|co|company|group|restaurant|cafe|school|hotel|agency|realtors)\b/g, "")
    .trim();
}

/**
 * Determines if two business listings are likely duplicates.
 */
export interface MinimalBusinessCompare {
  name: string;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}

export function isDuplicate(bizA: MinimalBusinessCompare, bizB: MinimalBusinessCompare): boolean {
  // 1. Check normalized phone matches (strong indicator)
  const phoneA = normalizePhone(bizA.phone);
  const phoneB = normalizePhone(bizB.phone);
  if (phoneA && phoneB && phoneA === phoneB) {
    return true;
  }

  // 2. Check normalized website matches (strong indicator)
  const webA = normalizeWebsite(bizA.website);
  const webB = normalizeWebsite(bizB.website);
  if (webA && webB && webA === webB) {
    return true;
  }

  // 3. Check fuzzy name match AND city match
  const nameA = cleanBusinessName(bizA.name);
  const nameB = cleanBusinessName(bizB.name);
  const cityA = bizA.city?.trim().toLowerCase();
  const cityB = bizB.city?.trim().toLowerCase();
  
  if (nameA && nameB && nameA === nameB && cityA && cityB && cityA === cityB) {
    // Additionally, verify address similarity if available
    if (bizA.address && bizB.address) {
      const addrA = bizA.address.toLowerCase().replace(/[^a-z0-9]/g, "");
      const addrB = bizB.address.toLowerCase().replace(/[^a-z0-9]/g, "");
      // If one address contains the other, or they are very similar
      if (addrA.includes(addrB) || addrB.includes(addrA)) {
        return true;
      }
    } else {
      // No address to compare, but name and city match is highly suggestive
      return true;
    }
  }

  return false;
}
