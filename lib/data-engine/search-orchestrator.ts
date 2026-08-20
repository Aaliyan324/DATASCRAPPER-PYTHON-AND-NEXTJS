import { SearchPlan, PlaceRecord } from "./types";
import { parseQueryWithGemini } from "./ai/query-understanding";
import { resolveLocation } from "./location-resolver";
import { buildSearchQueries } from "./query-expander";
import { textSearch } from "./google-places";
import { deduplicate } from "./deduplicator";
import { filterAndRank, calculateQualityScore } from "./ranking";
import { updateSearchJob, saveBusinesses } from "../db";

// ─────────────────────────────────────────────────────────────────
// Geographic zone databases (sub-areas for major Pakistani cities)
// Each zone produces multiple query variants, giving 60+ hits/zone
// ─────────────────────────────────────────────────────────────────

const CITY_ZONES: Record<string, string[]> = {
  lahore: [
    "Gulberg", "Gulberg III", "Gulberg II",
    "DHA Lahore", "DHA Phase 1 Lahore", "DHA Phase 2 Lahore",
    "DHA Phase 5 Lahore", "DHA Phase 6 Lahore", "DHA Phase 7 Lahore",
    "Johar Town", "Model Town", "Garden Town", "Faisal Town",
    "Township Lahore", "Wapda Town Lahore", "Bahria Town Lahore",
    "Bahria Orchard Lahore", "Lahore Cantt", "Iqbal Town",
    "Samanabad", "Shadman", "Muslim Town", "Sabzazar",
    "MM Alam Road", "Liberty Market", "Raiwind Road",
    "Askari 10 Lahore", "Askari 11 Lahore",
    "Allama Iqbal Town", "Shalimar Town", "Harbanspura",
    "Ichhra", "Bhatta Chowk", "Main Boulevard Lahore",
    "Cavalry Ground", "Barkat Market", "Garden Town Lahore",
  ],
  karachi: [
    "Clifton", "Clifton Block 2", "Clifton Block 4", "Clifton Block 9",
    "DHA Karachi", "DHA Phase 1 Karachi", "DHA Phase 4 Karachi", "DHA Phase 6 Karachi",
    "Gulshan-e-Iqbal", "Gulshan Block 1", "Gulshan Block 7",
    "Gulistan-e-Johar", "North Nazimabad", "Nazimabad",
    "PECHS", "PECHS Block 6", "Saddar Karachi",
    "Scheme 33", "Malir", "Korangi", "Surjani Town",
    "Orangi Town", "Bahria Town Karachi",
    "Bahadurabad", "Tariq Road", "Shahrah-e-Faisal",
    "Landhi", "Defence View Society Karachi",
    "Keamari", "Lyari", "Baldia Town",
    "Federal B Area", "Liaquatabad",
  ],
  rawalpindi: [
    "Saddar Rawalpindi", "Satellite Town Rawalpindi",
    "Bahria Town Rawalpindi", "Bahria Town Phase 7 Rawalpindi",
    "DHA Rawalpindi", "Peshawar Road Rawalpindi",
    "Murree Road Rawalpindi", "Adiala Road Rawalpindi",
    "Westridge", "Lalazar Rawalpindi", "Committee Chowk",
    "Chaklala Scheme", "Airport Housing Society",
    "6th Road Rawalpindi", "Raja Bazaar",
    "Trunk Bazaar", "Banni Chowk", "Liaquat Bagh",
  ],
  islamabad: [
    "Blue Area Islamabad", "F-6 Islamabad", "F-7 Islamabad",
    "F-7/1 Islamabad", "F-7/2 Islamabad", "F-7/4 Islamabad",
    "F-8 Islamabad", "F-10 Islamabad", "F-11 Islamabad",
    "G-10 Islamabad", "G-11 Islamabad", "G-9 Islamabad",
    "I-8 Islamabad", "I-9 Islamabad", "I-10 Islamabad",
    "Gulberg Greens Islamabad", "Bahria Town Islamabad",
    "B-17 Islamabad", "E-11 Islamabad", "Sector H-9",
    "Diplomatic Enclave Islamabad", "CDA Sectors Islamabad",
    "PWD Colony Islamabad", "Srinagar Highway Islamabad",
    "Zero Point Islamabad",
  ],
  faisalabad: [
    "Samanabad Faisalabad", "Peoples Colony Faisalabad",
    "Kohinoor City Faisalabad", "Dijkot Road Faisalabad",
    "Jaranwala Road Faisalabad", "Sargodha Road Faisalabad",
    "Satiana Road Faisalabad", "D Ground Faisalabad",
    "Ghulam Muhammad Abad", "Gulberg Faisalabad",
    "Canal Road Faisalabad", "Millat Road Faisalabad",
    "Susan Road Faisalabad", "Batala Colony Faisalabad",
  ],
  peshawar: [
    "Hayatabad Peshawar", "Hayatabad Phase 1",
    "Hayatabad Phase 3", "Hayatabad Phase 5",
    "University Road Peshawar", "Saddar Peshawar",
    "Khyber Bazaar Peshawar", "Shami Road Peshawar",
    "Ring Road Peshawar", "Peshawar Cantt",
    "Gulbahar Peshawar", "Dalazak Road Peshawar",
    "GT Road Peshawar", "Warsak Road Peshawar",
  ],
  multan: [
    "Cantonment Multan", "Gulgasht Colony Multan",
    "Bosan Road Multan", "Shah Rukn-e-Alam Multan",
    "Mumtazabad Multan", "Wapda Town Multan",
    "Hussain Agahi Multan", "Vehari Road Multan",
    "Chungi No 9 Multan", "New Multan",
    "Model Town Multan", "Khanewal Road Multan",
  ],
  gujranwala: [
    "Model Town Gujranwala", "Satellite Town Gujranwala",
    "DC Road Gujranwala", "Peoples Colony Gujranwala",
    "Wapda Town Gujranwala", "Cantt Gujranwala",
    "GT Road Gujranwala", "Gulshan Colony Gujranwala",
    "Rehman Pura Gujranwala", "Sialkot Road Gujranwala",
  ],
  sialkot: [
    "Cantt Sialkot", "Saddar Sialkot", "Model Town Sialkot",
    "Paris Road Sialkot", "Shahabpura Sialkot",
    "Gulshan Colony Sialkot", "Kutchery Road Sialkot",
    "Iqbal Road Sialkot",
  ],
  quetta: [
    "Cantonment Quetta", "Sariab Road Quetta",
    "Jinnah Road Quetta", "Double Road Quetta",
    "Samungli Road Quetta", "Quarry Road Quetta",
    "Satellite Town Quetta", "Airport Road Quetta",
  ],
  hyderabad: [
    "Latifabad Hyderabad", "Qasimabad Hyderabad",
    "Saddar Hyderabad", "Autobahn Road Hyderabad",
    "Hirabad Hyderabad", "Phuleli Canal Hyderabad",
    "Unit No 1 Hyderabad", "Unit No 8 Hyderabad",
  ],
  abbottabad: [
    "Abbottabad City", "Jinnahabad Abbottabad",
    "Kaghan Road Abbottabad", "Mandian Abbottabad",
    "Hashtnagar Abbottabad", "Mirpur Road Abbottabad",
  ],
  bahawalpur: [
    "Bahawalpur City", "Model Town Bahawalpur",
    "Satellite Town Bahawalpur", "Fareed Gate Bahawalpur",
    "Airport Road Bahawalpur",
  ],
  sargodha: [
    "Sargodha City", "University Road Sargodha",
    "Satellite Town Sargodha", "Chak No 1 Sargodha",
    "Military Road Sargodha",
  ],
};

// Medium cities — fewer zones
const MEDIUM_CITY_ZONES: Record<string, string[]> = {
  sahiwal: ["Sahiwal City", "Sahiwal Bypass", "Sahiwal Cantt", "Chichawatni Sahiwal"],
  okara: ["Okara City", "Okara Cantt", "Depalpur Okara"],
  jhang: ["Jhang City", "Chiniot Road Jhang", "Canal Road Jhang"],
  rahim_yar_khan: ["Rahim Yar Khan City", "Sadiqabad", "Airport Road Rahim Yar Khan"],
  sukkur: ["Sukkur City", "Rohri", "Airport Road Sukkur"],
  larkana: ["Larkana City", "Gar Canal Larkana"],
  mingora: ["Mingora City", "Saidu Sharif", "GT Road Mingora"],
  mardan: ["Mardan City", "Cantt Mardan", "GT Road Mardan"],
  mirpur: ["Mirpur AJK City", "Allama Iqbal Road Mirpur", "New Town Mirpur"],
  muzaffarabad: ["Muzaffarabad City", "Chattar Muzaffarabad"],
};

// ─────────────────────────────────────────────────────────────────
// Concurrency runner
// ─────────────────────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const curIndex = index++;
      results[curIndex] = await fn(items[curIndex]);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Generate multi-phrasing query variants for a zone
// Each zone gets several differently-worded queries to maximise
// the number of unique place IDs returned by the API.
// ─────────────────────────────────────────────────────────────────

function buildZoneQueryVariants(category: string, zone: string, parentCity: string): string[] {
  const country = "Pakistan";
  const categoryPlural = category.endsWith("s") ? category : `${category}s`;
  const variants = [
    `${category} in ${zone}, ${parentCity}, ${country}`,
    `${categoryPlural} near ${zone} ${parentCity}`,
    `best ${category} ${zone} ${parentCity}`,
    `${category} near ${zone}`,
  ];
  return variants;
}

// ─────────────────────────────────────────────────────────────────
// Progress helper
// ─────────────────────────────────────────────────────────────────

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
      parsedQuery: JSON.stringify({ query: plan, progress: { stage, detail } }),
    });
  } catch (err) {
    console.error("Failed to update job progress:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Raw-place → lightweight dedup key (used during scraping to avoid
// re-running full dedup on the growing array every iteration)
// ─────────────────────────────────────────────────────────────────

function placeKey(raw: any): string {
  return raw.id || [raw.displayName?.text, raw.formattedAddress].join("|");
}

// ─────────────────────────────────────────────────────────────────
// Main workflow
// ─────────────────────────────────────────────────────────────────

export async function runSearchWorkflow(
  jobId: string,
  command: string,
  limit: number
): Promise<void> {
  const startedAt = new Date();
  let searchPlan: SearchPlan | null = null;

  try {
    // ── 1. PARSING ──────────────────────────────────────────────
    await updateSearchJob(jobId, { status: "PARSING", startedAt });
    console.log(`[Job ${jobId}] Parsing: "${command}"`);

    searchPlan = await parseQueryWithGemini(command);

    // Honour explicit count from query, fall back to caller limit, then default
    if (!searchPlan.requested_result_count) {
      searchPlan.requested_result_count = limit || 100;
    }

    await updateJobProgress(jobId, searchPlan, "PARSING", 15,
      "Understanding request", "Query parameters extracted");

    // ── 2. LOCATION RESOLUTION ───────────────────────────────────
    console.log(`[Job ${jobId}] Resolving location…`);
    await updateJobProgress(jobId, searchPlan, "PARSING", 25,
      "Resolving location", `Target: ${searchPlan.location.city || "Pakistan"}`);

    const resolvedLocation = await resolveLocation(searchPlan.location);
    searchPlan.location = resolvedLocation;

    // ── 3. QUERY PLANNING ────────────────────────────────────────
    const targetResults = searchPlan.requested_result_count || 100;
    const cityKey = (resolvedLocation.city || "").toLowerCase().replace(/\s+/g, "_");
    const cityKeySpace = (resolvedLocation.city || "").toLowerCase();

    const allQueries: string[] = [];

    // Always try zone-partitioned queries first for any known city
    const zones =
      CITY_ZONES[cityKeySpace] ||
      CITY_ZONES[cityKey] ||
      MEDIUM_CITY_ZONES[cityKeySpace] ||
      MEDIUM_CITY_ZONES[cityKey] ||
      [];

    if (zones.length > 0) {
      console.log(`[Job ${jobId}] Zone partitioning: ${zones.length} zones for ${resolvedLocation.city}`);

      // For each zone generate N variants; limit total zones based on target
      const maxZones = targetResults <= 50 ? 6
        : targetResults <= 100 ? 12
        : targetResults <= 200 ? 20
        : zones.length;

      for (const zone of zones.slice(0, maxZones)) {
        // 4 variants × 20 results × 3 pages = up to 240 unique results per zone
        // We cap pages per query to 2 (40 results/query) to stay within budget
        const variants = buildZoneQueryVariants(searchPlan.category, zone, resolvedLocation.city || "");
        allQueries.push(...variants);
      }

      // Also add 2–3 broad city-level sweeps as a second pass to catch stragglers
      const cat = searchPlan.category;
      const city = resolvedLocation.city || resolvedLocation.district || "Pakistan";
      allQueries.push(
        `${cat} in ${city}, Pakistan`,
        `${cat}s near ${city} Pakistan`,
        `best ${cat} ${city}`,
      );

    } else {
      // Unknown city / rural / micro-locality — use expander variants
      console.log(`[Job ${jobId}] No zone map found; using query expander`);
      const baseQueries = buildSearchQueries(searchPlan, 12);
      allQueries.push(...baseQueries);
    }

    // Deduplicate query strings case-insensitively
    const seenQueryStrs = new Set<string>();
    const uniqueQueries: string[] = [];
    for (const q of allQueries) {
      const lq = q.toLowerCase().trim();
      if (!seenQueryStrs.has(lq)) { seenQueryStrs.add(lq); uniqueQueries.push(q); }
    }

    console.log(`[Job ${jobId}] ${uniqueQueries.length} search queries planned`);

    // ── 4. SCRAPING ──────────────────────────────────────────────
    await updateJobProgress(jobId, searchPlan, "SCRAPING", 35,
      "Connecting to data engine",
      `${uniqueQueries.length} queries across ${zones.length || 1} area(s)`);

    const rawPlaces: any[] = [];
    // Fast dedup tracker using place IDs during scraping
    const seenPlaceKeys = new Set<string>();

    // Budget: pages needed = target * 5 raw headroom / 20 results per page
    // e.g. target=100 → 500 raw / 20 = 25 pages minimum; we allow up to 400
    const maxApiPages = Math.min(Math.ceil((targetResults * 5) / 20), 400);
    let apiPagesUsed = 0;
    let queriesRun = 0;

    // Concurrency: 5 parallel queries
    const CONCURRENCY = 5;

    // We split into batches; between batches we check if target is reached
    const batchSize = CONCURRENCY * 4; // 16 queries/batch
    const totalBatches = Math.ceil(uniqueQueries.length / batchSize);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      // Early exit only when we have 5× the target as raw unique places
      // (large headroom to survive full multi-field dedup losses)
      if (seenPlaceKeys.size >= targetResults * 5) {
        console.log(`[Job ${jobId}] Raw headroom reached (${seenPlaceKeys.size} unique). Stopping.`);
        break;
      }
      if (apiPagesUsed >= maxApiPages) {
        console.log(`[Job ${jobId}] API page budget exhausted (${apiPagesUsed}).`);
        break;
      }

      const batchQueries = uniqueQueries.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
      const progressPct = Math.min(35 + Math.floor((batchIdx / totalBatches) * 50), 84);

      await updateJobProgress(
        jobId, searchPlan!, "SCRAPING", progressPct,
        "Searching Google Places",
        `Batch ${batchIdx + 1}/${totalBatches} | Unique places so far: ${seenPlaceKeys.size}`,
        seenPlaceKeys.size
      );

      await runWithConcurrency(batchQueries, CONCURRENCY, async (queryStr) => {
        if (seenPlaceKeys.size >= targetResults * 5 || apiPagesUsed >= maxApiPages) return;

        queriesRun++;
        console.log(`[Job ${jobId}] Q${queriesRun}: "${queryStr}"`);

        try {
          const results = await textSearch(queryStr, searchPlan!);

          apiPagesUsed += Math.max(1, Math.ceil(results.length / 20));

          for (const r of results) {
            const key = placeKey(r);
            if (!seenPlaceKeys.has(key)) {
              seenPlaceKeys.add(key);
              rawPlaces.push(r);
            }
          }
        } catch (e) {
          console.error(`[Job ${jobId}] Error on query "${queryStr}":`, e);
        }
      });
    }

    console.log(`[Job ${jobId}] Scraping done. Raw unique: ${rawPlaces.length}. API pages used: ${apiPagesUsed}`);

    // ── 5. NORMALISE ─────────────────────────────────────────────
    await updateJobProgress(jobId, searchPlan, "SCRAPING", 86,
      "Normalizing & deduplicating",
      `${rawPlaces.length} raw records → running full deduplication…`);

    const normalized: PlaceRecord[] = rawPlaces.map((raw) => {
      const display = raw.displayName || {};
      const loc = raw.location || {};
      const address = raw.formattedAddress || null;

      let area: string | null = null;
      if (address) {
        const parts = address.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 3) area = parts[parts.length - 3];
      }

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
        phone: raw.nationalPhoneNumber || raw.internationalPhoneNumber || null,
        website: raw.websiteUri || null,
        google_maps_url: raw.googleMapsUri || null,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        rating: raw.rating ?? null,
        review_count: raw.userRatingCount ?? null,
        business_status: raw.businessStatus ?? null,
        source: "Google Places API (New)",
        retrieved_at: raw._retrieved_at,
      } as PlaceRecord;
    });

    // Full multi-field deduplication (catches same business, different place IDs)
    const unique = deduplicate(normalized);

    // Geo-rank (filter out-of-area, sort by proximity + quality)
    let ranked = unique;
    if (resolvedLocation.latitude || resolvedLocation.city) {
      ranked = filterAndRank(unique, searchPlan);
    }

    // Slice to requested count
    const final = ranked.slice(0, targetResults);

    console.log(`[Job ${jobId}] After dedup+rank: ${unique.length} unique → delivering ${final.length}`);

    // ── 6. SAVE ──────────────────────────────────────────────────
    const businessesToSave = final.map((r) => ({
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
        qualityScore: calculateQualityScore(r),
        distance_km: r.distance_km || null,
      },
    }));

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
        progress: {
          stage: "Preparing results",
          detail: `Discovered ${businessesToSave.length} unique businesses (${unique.length} after dedup, ${rawPlaces.length} raw).`,
        },
      }),
    });

    console.log(`[Job ${jobId}] Done ✓ — ${businessesToSave.length} records saved.`);

  } catch (error: any) {
    console.error(`[Job ${jobId}] Fatal error:`, error);
    await updateSearchJob(jobId, {
      status: "ERROR",
      error: error.message || "An unexpected error occurred",
      completedAt: new Date(),
      progress: 0,
      currentStage: "Failed",
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// textSearchCapped — wraps textSearch but honours a page cap so we
// don't over-fetch near the API budget ceiling
// ─────────────────────────────────────────────────────────────────

async function textSearchCapped(
  query: string,
  plan: SearchPlan,
  maxPages: number
): Promise<any[]> {
  // Import the real textSearch and temporarily cap its page loop
  const { textSearch } = await import("./google-places");

  // We dynamically set a reduced pageSize-cap by monkey-patching isn't ideal;
  // instead we pass a plan copy with a hint the fetcher can use.
  // For simplicity we call textSearch directly — it already supports 3-page max
  // internally, so we just cap our result slice here.
  const results = await textSearch(query, plan);
  return results.slice(0, maxPages * 20);
}
