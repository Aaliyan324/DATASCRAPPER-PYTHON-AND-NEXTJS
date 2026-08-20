/**
 * Enhanced phone number normalization for Pakistani numbers.
 * Builds on existing normalizer.ts normalizePhone().
 */

import { normalizePhone as baseNormalizePhone } from "../data-engine/normalizer";

/**
 * Normalize phone to international format: +923XXXXXXXXX
 * Re-exports from base normalizer for consistency.
 */
export function normalizePhoneToInternational(value: string | null | undefined): string | null {
  return baseNormalizePhone(value);
}

/**
 * Extract all phone numbers from a record's data.
 * Handles cases where multiple phones are in additionalData.
 */
export function extractAllPhones(record: {
  phone?: string | null;
  phones?: string[];
  additionalData?: any;
}): string[] {
  const phones: string[] = [];
  const seen = new Set<string>();

  const addPhone = (raw: string | null | undefined) => {
    if (!raw) return;
    const normalized = normalizePhoneToInternational(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      phones.push(normalized);
    }
  };

  // Primary phone
  addPhone(record.phone);

  // phones array
  if (record.phones) {
    for (const p of record.phones) {
      addPhone(p);
    }
  }

  // additionalData phones
  if (record.additionalData) {
    if (Array.isArray(record.additionalData.phones)) {
      for (const p of record.additionalData.phones) {
        addPhone(p);
      }
    }
    if (record.additionalData.phone_national) {
      addPhone(record.additionalData.phone_national);
    }
    if (record.additionalData.international_phone) {
      addPhone(record.additionalData.international_phone);
    }
  }

  return phones;
}

/**
 * Compare two sets of phone numbers.
 * Returns a similarity score from 0 to 1.
 *
 * - Any overlap between the two sets = high similarity
 * - Empty sets = no signal (return -1 to indicate "ignore")
 */
export function comparePhoneSets(phonesA: string[], phonesB: string[]): number {
  if (phonesA.length === 0 || phonesB.length === 0) return -1; // no signal

  const setA = new Set(phonesA);
  const setB = new Set(phonesB);

  // Check for any overlap
  for (const p of setA) {
    if (setB.has(p)) return 1.0;
  }

  // No overlap — but both have phones, so this is a negative signal
  return 0.0;
}

/**
 * Validate Pakistani landline area codes.
 */
const VALID_LANDLINE_AREAS = new Set([
  "021",  // Karachi
  "042",  // Lahore
  "051",  // Islamabad / Rawalpindi
  "061",  // Multan
  "041",  // Faisalabad
  "091",  // Peshawar
  "081",  // Quetta
  "061",  // Multan
  "049",  // Sialkot
  "055",  // Gujranwala
  "062",  // Bahawalpur
  "046",  // Hyderabad (old)
  "033",  // Azad Kashmir
]);

/**
 * Check if a phone number looks like a valid Pakistani number.
 */
export function isValidPakistaniPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneToInternational(phone);
  if (!normalized) return false;

  // Mobile: +923XXXXXXXXX (11 digits after +92)
  if (/^\+923\d{9}$/.test(normalized)) return true;

  // Landline: +92XXYYYYYYY (variable length)
  if (/^\+92\d{9,10}$/.test(normalized)) return true;

  return false;
}
