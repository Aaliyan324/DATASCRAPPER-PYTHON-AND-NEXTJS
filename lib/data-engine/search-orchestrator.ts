import { SearchPlan, PlaceRecord, Location, FieldName } from "./types";
import { parseQueryWithGemini } from "./ai/query-understanding";
import { resolveLocation } from "./location-resolver";
import { buildSearchQueries } from "./query-expander";
import { textSearch } from "./google-places";
import { deduplicate } from "./deduplicator";
import { filterAndRank, calculateQualityScore, getEffectiveRadius } from "./ranking";
import { updateSearchJob, saveBusinesses, getSearchJob, Business } from "../db";

// Partition subareas for large Pakistani cities
const CITY_ZONES: Record<string, string[]> = {
  lahore: [
    "Gulberg",
    "DHA Lahore",
    "Johar Town",
    "Model Town",
    "Garden Town",
    "Faisal Town",
    "Township",
    "Wapda Town",
    "Bahria Town Lahore",
    "Lahore Cantt",
    "Iqbal Town",
    "Samanabad",
    "Shadman",
    "Muslim Town",
    "Sabzazar",
    "MM Alam Road",
    "Liberty Market",
    "Raiwind Road",
    "Askari Lahore",
  ],
  karachi: [
    "Clifton",
    "DHA Karachi",
    "Gulshan-e-Iqbal",
    "Gulistan-e-Johar",
    "North Nazimabad",
    "Nazimabad",
    "PECHS",
    "Saddar Karachi",
    "Scheme 33",
    "Malir",
    "Korangi",
    "Surjani Town",
    "Orangi Town",
    "Bahria Town Karachi",
  ],
  rawalpindi: [
    "Saddar Rawalpindi",
    "Satellite Town Rawalpindi",
    "Commercial Market Rawalpindi",
    "Chaklala Scheme",
    "Bahria Town Rawalpindi",
    "DHA Rawalpindi",
    "Peshawar Road",
    "Murree Road",
    "Adiala Road",
    "Westridge",
    "Lalazar",
    "Committee Chowk",
  ],
  islamabad: [
    "Blue Area",
    "F-6",
    "F-7",
    "F-8",
    "F-10",
    "F-11",
    "G-11",
    "G-10",
    "I-8",
    "I-9",
    "Gulberg Greens",
    "Bahria Town Islamabad",
    "B-17 Islamabad",
    "E-11 Islamabad",
  ],
  faisalabad: [
    "Samanabad Faisalabad",
    "Peoples Colony Faisalabad",
    "Kohinoor City Faisalabad",
    "Dijkot Road Faisalabad",
    "Jaranwala Road Faisalabad",
    "Sargodha Road Faisalabad",
    "Satiana Road Faisalabad",
  ],
  peshawar: [
    "Hayatabad Peshawar",
    "University Road Peshawar",
    "Saddar Peshawar",
    "Khyber Bazaar Peshawar",
    "Shami Road Peshawar",
    "Ring Road Peshawar",
  ],
  multan: [
    "Cantonment Multan",
    "Gulgasht Colony Multan",
    "Bosan Road Multan",
    "Shah Rukn-e-Alam Multan",
    "Mumtazabad Multan",
    "Wapda Town Multan",
  ],
  gujranwala: [
    "Model Town Gujranwala",
    "Satellite Town Gujranwala",
    "DC Road Gujranwala",
    "Peoples Colony Gujranwala",
    "Wapda Town Gujranwala",
    "Cantt Gujranwala",
  ],
  sialkot: [
    "Cantt Sialkot",
    "Saddar Sialkot",
    "Model Town Sialkot",
    "Paris Road Sialkot",
    "Shahabpura Sialkot",
  ],
  quetta: [
    "Cantonment Quetta",
    "Sariab Road Quetta",
    "Jinnah Road Quetta",
    "Double Road Quetta",
    "Samungli Road Quetta",
  ],
  hyderabad: [
    "Latifabad",
    "Qasimabad",
    "Saddar Hyderabad",
    "Autobahn Road Hyderabad",
  ],
};

// Small location subareas (fewer queries)
const SMALL_CITY_ZONES: Record<string, string[]> = {
  sahiwal: ["Sahiwal City", "Sahiwal Railway Station", "Sahiwal Bypass", "Sahiwal Cantt"],
  okara: ["Okara City", "Okara Cantt", "Okara Bypass"],
};

/**
 * Concurrency runner helper
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const promises: Promise<void>[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const curIndex = index++;
      const item = items[curIndex];
      results[curIndex] = await fn(item);
    }
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    promises.push(worker());
  }

  await Promise.all(promises);
  return results;
}

/**
 * Updates search job status helper.
 */
async function updateJobProgress(
  jobId: string,
  plan: SearchPlan,
  status: any,
  progress: number,
  stage: string,
  detail: string,
  recordsFound = 0
) {
  try {
    await updateSearchJob(jobId, {
      status,
      progress,
      currentStage: stage,
      recordsFound,
      parsedQuery: JSON.stringify({
        query: plan,
        progress: { stage, detail },
      }),
    });
  } catch (err) {
    console.error("Failed to update job progress in database:", err);
  }
}

/**
 * Runs the search engine workflow end-to-end.
 */
export async function runSearchWorkflow(
  jobId: string,
  command: string,
  limit: number
): Promise<void> {
  const startedAt = new Date();
  let searchPlan: SearchPlan | null = null;

  try {
    // 1. Initial State: PARSING
    await updateSearchJob(jobId, {
      status: "PARSING",
      startedAt,
    });

    console.log(`[Search Job ${jobId}] Understanding query: "${command}"`);
    searchPlan = await parseQueryWithGemini(command);

    if (!searchPlan.requested_result_count && limit) {
      searchPlan.requested_result_count = limit;
    }

    await updateJobProgress(
      jobId,
      searchPlan,
      "PARSING",
      20,
      "Understanding request",
      "Extracted query parameters and filters"
    );

    // 2. Resolve Location Coordinates
    console.log(`[Search Job ${jobId}] Resolving location...`);
    await updateJobProgress(
      jobId,
      searchPlan,
      "PARSING",
      30,
      "Resolving location",
      `Analyzing target location: ${searchPlan.location.city || "Pakistan"}`
    );

    const resolvedLocation = await resolveLocation(searchPlan.location);
    searchPlan.location = resolvedLocation;

    // 3. Search Planning & Partitioning
    const targetResults = searchPlan.requested_result_count || 50;
    const cityKey = (resolvedLocation.city || "").toLowerCase();
    
    // Partition list holds either sub-queries or location plans
    const partitionQueries: string[] = [];

    // Is it a large city or target is high?
    const isLargeCity = CITY_ZONES[cityKey] !== undefined;
    const isSmallCity = SMALL_CITY_ZONES[cityKey] !== undefined;

    if (targetResults >= 50 && (isLargeCity || isSmallCity)) {
      console.log(`[Search Job ${jobId}] Partitioning large search area: ${resolvedLocation.city}`);
      const zones = CITY_ZONES[cityKey] || SMALL_CITY_ZONES[cityKey] || [];
      
      // Determine how many sub-zones to use based on requested results count
      // For 100 results, search 4-6 zones. For 200, search 8-10.
      const maxZones = targetResults <= 100 ? 6 : targetResults <= 200 ? 10 : zones.length;
      const selectedZones = zones.slice(0, maxZones);

      for (const zone of selectedZones) {
        partitionQueries.push(`${searchPlan.category} in ${zone}, ${resolvedLocation.city}, Pakistan`);
      }
    } else {
      // Small search / simple location: build query variants
      const baseQueries = buildSearchQueries(searchPlan);
      partitionQueries.push(...baseQueries);
    }

    console.log(`[Search Job ${jobId}] Formulated ${partitionQueries.length} search queries:`, partitionQueries);

    // 4. SCRAPING Phase
    await updateJobProgress(
      jobId,
      searchPlan,
      "SCRAPING",
      40,
      "Connecting to data engine",
      `Search plan configured with ${partitionQueries.length} queries`
    );

    const rawPlaces: any[] = [];
    const seenPlaceIds = new Set<string>();

    const budgetMaxQueries = Math.min(partitionQueries.length, 25);
    const budgetMaxApiCalls = 60;
    let apiCallsCount = 0;
    let queriesRun = 0;

    // We run queries in batches with bounded concurrency (3 to 5)
    const concurrency = 3;

    await runWithConcurrency(
      partitionQueries.slice(0, budgetMaxQueries),
      concurrency,
      async (queryStr) => {
        // Stop fetching if budget is exhausted or if we have already met target results
        if (apiCallsCount >= budgetMaxApiCalls) return;
        
        // Count deduplicated records so far to check targetResults stop
        const currentUniqueCount = deduplicate(
          rawPlaces.map((p) => {
            const display = p.displayName || {};
            const location = p.location || {};
            return {
              place_id: p.id,
              business_name: display.text,
              phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
              website: p.websiteUri,
              address: p.formattedAddress,
              latitude: location.latitude,
              longitude: location.longitude,
              country: "Pakistan",
              source: "Google Places API (New)"
            };
          })
        ).length;

        if (currentUniqueCount >= targetResults) {
          console.log(`[Search Job ${jobId}] Target count of ${targetResults} met. Stopping batch...`);
          return;
        }

        queriesRun++;
        console.log(`[Search Job ${jobId}] Searching Places (Query ${queriesRun}): "${queryStr}"`);
        
        try {
          await updateJobProgress(
            jobId,
            searchPlan!,
            "SCRAPING",
            Math.min(40 + Math.floor((queriesRun / partitionQueries.length) * 40), 80),
            "Searching Google Places",
            `Query: "${queryStr}" | Duplicates removed: ${rawPlaces.length - currentUniqueCount}`,
            currentUniqueCount
          );

          apiCallsCount++; // increments estimated calls
          // @ts-ignore
          const results = await textSearch(queryStr, searchPlan!);
          rawPlaces.push(...results);

        } catch (e) {
          console.error(`Error searching query: "${queryStr}":`, e);
        }
      }
    );

    // 5. Finalizing Results (Cleaning & Deduplication)
    await updateJobProgress(
      jobId,
      searchPlan,
      "SCRAPING",
      85,
      "Cleaning and normalizing",
      `Discovered ${rawPlaces.length} raw listings. Starting deduplication...`
    );

    // Map raw items to PlacesRecord
    const normalized = rawPlaces.map((raw) => {
      const display = raw.displayName || {};
      const location = raw.location || {};
      const address = raw.formattedAddress || null;
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
        business_name: display.text || "Unknown",
        category: searchPlan!.category,
        address,
        area,
        city: resolvedLocation.city,
        district: resolvedLocation.district,
        province: resolvedLocation.province,
        country: "Pakistan",
        phone: rawPhone ? rawPhone.replace(/[^\d+]/g, "") : null,
        website: raw.websiteUri || null,
        google_maps_url: raw.googleMapsUri || null,
        latitude: lat,
        longitude: lng,
        rating: raw.rating ?? null,
        review_count: raw.userRatingCount ?? null,
        business_status: raw.businessStatus ?? null,
        source: "Google Places API (New)",
        retrieved_at: raw._retrieved_at,
      } as PlaceRecord;
    });

    const uniqueRecords = deduplicate(normalized);

    // Filter and rank geographically
    let ranked = uniqueRecords;
    if (resolvedLocation.latitude || resolvedLocation.city) {
      ranked = filterAndRank(uniqueRecords, searchPlan);
    }

    // Limit to requested result count
    const limited = ranked.slice(0, targetResults);

    // 6. DB Mapping & Saving
    const businessesToSave = limited.map((r) => {
      const qualityScore = calculateQualityScore(r);
      return {
        name: r.business_name || "Unknown",
        category: r.category || searchPlan!.category || "Business",
        address: r.address || null,
        area: r.area || null,
        city: r.city || resolvedLocation.city || null,
        country: r.country || "Pakistan",
        phone: r.phone || null,
        email: null,
        website: r.website || null,
        rating: r.rating || null,
        reviewCount: r.review_count || null,
        price: null,
        openingHours: null,
        description: null,
        source: r.source || "Google Places API (New)",
        sourceUrl: r.google_maps_url || null,
        latitude: r.latitude || null,
        longitude: r.longitude || null,
        additionalData: {
          google_maps_url: r.google_maps_url || null,
          business_status: r.business_status || null,
          review_count: r.review_count || null,
          qualityScore,
          distance_km: r.distance_km || null,
          location_match_score: r.location_match_score || null,
        },
      };
    });

    console.log(`[Search Job ${jobId}] Saving ${businessesToSave.length} records into database...`);
    await saveBusinesses(jobId, businessesToSave);

    await updateSearchJob(jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      progress: 100,
      currentStage: "Completed",
      totalResults: businessesToSave.length,
      recordsFound: businessesToSave.length,
      parsedQuery: JSON.stringify({
        query: searchPlan,
        progress: { stage: "Preparing results", detail: `Discovered ${businessesToSave.length} unique businesses.` },
      }),
    });

    console.log(`[Search Job ${jobId}] Job finished successfully.`);

  } catch (error: any) {
    console.error(`[Search Job ${jobId}] Job failed:`, error);
    await updateSearchJob(jobId, {
      status: "ERROR",
      error: error.message || "An unexpected error occurred during search query",
      completedAt: new Date(),
      progress: 0,
      currentStage: "Failed",
    });
  }
}
