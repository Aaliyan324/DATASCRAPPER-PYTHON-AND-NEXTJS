/**
 * Master record creation — merge duplicate group into a single clean record.
 * Takes the best available information from all records in a group.
 */

import { BusinessRecord, DuplicateGroup } from "./types";
import { extractAllPhones, normalizePhoneToInternational } from "./phone";
import { extractAllWebsites, normalizeWebsiteCanonical } from "./website";
import { computeRecordQuality } from "./clustering";

/**
 * Merge a duplicate group into a single master record.
 * Takes the best non-null value for each field from all records.
 */
export function mergeGroup(group: DuplicateGroup): BusinessRecord {
  const records = group.records;
  if (records.length === 0) throw new Error("Empty duplicate group");
  if (records.length === 1) return records[0];

  // Start with the master record (first record is master by convention)
  const masterIdx = records.findIndex(r => r.id === group.masterRecordId);
  const master = masterIdx >= 0 ? { ...records[masterIdx] } : { ...records[0] };

  // Collect all phones and websites
  const allPhones = new Set<string>();
  const allWebsites = new Set<string>();
  const mergedFrom: string[] = [];

  for (const r of records) {
    // Track merged record IDs
    if (r.id) mergedFrom.push(r.id);

    // Collect phones
    const phones = extractAllPhones(r);
    for (const p of phones) allPhones.add(p);

    // Collect websites
    const sites = extractAllWebsites(r);
    for (const s of sites) allWebsites.add(s);

    // Fill missing fields from other records
    if (!master.phone && r.phone) master.phone = r.phone;
    if (!master.website && r.website) master.website = r.website;
    if (!master.address && r.address) master.address = r.address;
    if (!master.area && r.area) master.area = r.area;
    if (!master.city && r.city) master.city = r.city;
    if (!master.district && r.district) master.district = r.district;
    if (!master.province && r.province) master.province = r.province;
    if (!master.category && r.category) master.category = r.category;
    if (!master.placeId && r.placeId) master.placeId = r.placeId;
    if (!master.googleMapsUrl && r.googleMapsUrl) master.googleMapsUrl = r.googleMapsUrl;
    if (!master.businessStatus && r.businessStatus) master.businessStatus = r.businessStatus;
    if (!master.source && r.source) master.source = r.source;

    // Take the better rating
    if (r.rating != null) {
      if (master.rating == null || r.rating > master.rating) {
        master.rating = r.rating;
      }
    }

    // Take the higher review count
    if (r.reviewCount != null) {
      if (master.reviewCount == null || r.reviewCount > master.reviewCount) {
        master.reviewCount = r.reviewCount;
      }
    }

    // Take coordinates if missing
    if (master.latitude == null && r.latitude != null) {
      master.latitude = r.latitude;
      master.longitude = r.longitude;
    }
  }

  // Set merged arrays
  master.phones = [...allPhones];
  master.websites = [...allWebsites];

  // Set primary phone/website from arrays if missing
  if (!master.phone && master.phones.length > 0) {
    master.phone = master.phones[0];
  }
  if (!master.website && master.websites.length > 0) {
    master.website = master.websites[0];
  }

  // Set dedup metadata
  master.duplicateGroupId = group.groupId;
  master.mergedRecordCount = records.length;
  master.mergedFrom = mergedFrom;
  master.duplicateScore = group.duplicateScore;
  master.deduplicationReason = group.reason;

  // Compute data completeness (0–100)
  master.dataCompleteness = computeDataCompleteness(master);

  // Confidence score based on group score and record quality
  master.confidenceScore = Math.round(
    group.duplicateScore * 0.6 + computeRecordQuality(master) * 0.4
  );

  return master;
}

/**
 * Compute data completeness as a percentage (0–100).
 */
function computeDataCompleteness(record: BusinessRecord): number {
  const fields = [
    record.name,
    record.phone,
    record.website,
    record.address,
    record.area,
    record.city,
    record.category,
    record.latitude != null ? "coords" : null,
    record.rating != null ? "rating" : null,
    record.reviewCount != null ? "reviews" : null,
    record.placeId,
  ];

  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
