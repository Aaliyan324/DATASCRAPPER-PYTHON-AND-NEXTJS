import { SearchPlan, FieldName } from "../types";
import { parseQuery, SearchQuery } from "../../query-parser";

const SYSTEM_INSTRUCTION = `
You are the intent parser for a Pakistan-focused place-data engine.

Your ONLY job is to convert a user's natural-language request into the supplied
SearchPlan schema. Never invent businesses, phone numbers, websites, ratings,
addresses, or other factual place records.

Understand English, Roman Urdu, Urdu script, and mixed input. Be tolerant of
spelling variants and ungrammatical input.

=== PAKISTAN LOCATION INTELLIGENCE ===

Pakistan has a deep administrative hierarchy and many local naming conventions.
Extract the MOST SPECIFIC location the user mentions.

Administrative hierarchy (largest to smallest):
  Province > Division > District > Tehsil > Sub-Division > Union Council > City/Town

Rural location types:
  Village, Chak (Chak No., Chak #), Mouza/Mauza, Basti, Abadi, Dera, Kot, Qasba, Gaon
  - Chak numbers like "Chak 42/12-L" or "Chak 84/6-R" MUST be preserved in full.
    Never truncate "42/12-L" to "42".
  - Mouza, Basti, Dera, Kot, Qasba are village-level entities, not cities.

Housing society subdivisions:
  Housing Society (e.g. DHA, Bahria Town, Gulberg Greens, Johar Town, Model Town,
  Lake City, Wapda Town, Park View City, Bahria Orchard, Gulberg Residencia)
  Phase (e.g. Phase 6), Sector (e.g. Sector C), Block (e.g. Block A)
  - "DHA Phase 6 Lahore" → housing_society=DHA, phase=Phase 6, city=Lahore
  - "Gulberg Greens Block A" → housing_society=Gulberg Greens, block=Block A

Islamabad/Rawalpindi sector format:
  - "F-7/2" → sector=F-7, block=F-7/2 (sub-sector stored in block)
  - "G-11/3" → sector=G-11, block=G-11/3

Micro-localities:
  Mohalla/Mohallah, Colony, Abadi, Neighborhood, Area

Markets and Bazaars:
  Bazaar/Bazar, Market, Mandi, Commercial Market, Main Market
  - "Raja Bazaar" is a bazaar in Rawalpindi, not the city itself.
  - "Liberty Market" is a market in Lahore.

Chowks, Addas, and junctions:
  Chowk/Chauk, Mor/Morr, Adda, Stop, Naka, Phatak, Pull, Bridge

Roads:
  Road/Rd, Main Road, Link Road, Bypass, GT Road, Highway, Expressway,
  Boulevard, Street/St

Landmarks:
  Railway stations, hospitals, stadiums, airports, monuments, etc.

Kalan/Khurd:
  These are part of settlement names (e.g. "XYZ Kalan", "XYZ Khurd").
  NEVER strip them during parsing. They distinguish different settlements.

=== SEARCH PREPOSITION ===

Detect the spatial relationship:
- "in" / "main" / "mein" / "andar" → preposition = "in" (prefer businesses inside the area)
- "inside" → preposition = "inside" (stricter geographic filtering)
- "near" / "qareeb" / "nazdeek" / "paas" / "ke paas" → preposition = "near" (allow surrounding areas)
- "around" → preposition = "around" (search around resolved coordinates)

=== DISTANCE AWARENESS ===

Extract explicit distances:
- "within 1 km" → distance_meters = 1000
- "within 500 meters" → distance_meters = 500
- "within 2 kilometers" → distance_meters = 2000
- "within 5 km" → distance_meters = 5000

=== LOCATION TYPE ===

Set location_type to the most specific category:
  province, division, district, tehsil, city, town, union_council,
  village, chak, mouza, basti, colony, housing_society, phase,
  sector, block, market, bazaar, chowk, road, landmark

=== ROMAN URDU FILLER WORDS ===

Recognize and skip these filler/context words when extracting locations:
  main, mein, me, ke, kay, ka, ki, k, par, qareeb, nazdeek, paas, andar,
  dhundo, dhoondo, dhoondho, talash, karo, find, nikal, nikaal, batao,
  batado, chahiye, chaheye, list, data, information, do

=== URDU SCRIPT ===

Normalize Urdu script before extraction. Handle:
  ساہیوال = Sahiwal, لاہور = Lahore, اسلام آباد = Islamabad, etc.

=== GENERAL RULES ===

- Resolve locations against Pakistan.
- Prefer a known Pakistani location over a similarly named foreign location.
- If the location is genuinely ambiguous, set confident=false and explain why.
- "dhundo/dhoondo/dhoondho/talash karo/find karo" means search.
- "nikal do/nikaal do/batao/batado" means retrieve/provide.
- "chahiye/chaheye" means requested information.
- "list bana do/list do/data chahiye/information chahiye" means list/data intent.

Field rules:
- ALWAYS include phone and website in the fields list.
- Always include business_name and address as core fields.
- "complete information" means the extended default set.
- If the user asks for a count, set requested_result_count.
- Detect export requests for Excel/PDF/both.

Filters:
- Capture explicit constraints such as private, public, cheap, etc.

Category examples:
hotel/hotels -> hotel, school/schools -> school, college/colleges -> college,
university/universities -> university, hospital/hospitals -> hospital,
restaurant/restaurants -> restaurant, cafe/cafes -> cafe,
pharmacy/pharmacies -> pharmacy, shop/shops -> shop, business -> business

Use a concise English category.
`;

const SEARCH_PLAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: {
      type: "STRING",
      description: "Business/place category, e.g. hotel, school, restaurant.",
    },
    location: {
      type: "OBJECT",
      properties: {
        country: { type: "STRING" },
        province: { type: "STRING" },
        division: { type: "STRING" },
        district: { type: "STRING" },
        tehsil: { type: "STRING" },
        city: { type: "STRING" },
        town: { type: "STRING" },
        union_council: { type: "STRING" },
        locality: { type: "STRING" },
        neighborhood: { type: "STRING" },
        village: { type: "STRING" },
        mouza: { type: "STRING" },
        colony: { type: "STRING" },
        basti: { type: "STRING" },
        housing_society: { type: "STRING" },
        phase: { type: "STRING" },
        sector: { type: "STRING" },
        block: { type: "STRING" },
        market: { type: "STRING" },
        bazaar: { type: "STRING" },
        chowk: { type: "STRING" },
        road: { type: "STRING" },
        landmark: { type: "STRING" },
        location_type: { type: "STRING" },
        confidence: { type: "NUMBER" },
        confident: { type: "BOOLEAN" },
        confidence_note: { type: "STRING" },
        preposition: {
          type: "STRING",
          enum: ["in", "inside", "near", "around"],
        },
        distance_meters: { type: "INTEGER" },
      },
      required: ["country", "confidence", "confident", "preposition"],
    },
    filters: {
      type: "OBJECT",
      properties: {
        ownership: { type: "STRING" },
        price: { type: "STRING" },
        status: { type: "STRING" },
      },
    },
    fields: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: [
          "business_name",
          "category",
          "address",
          "area",
          "phone",
          "website",
          "google_maps_url",
          "latitude",
          "longitude",
          "rating",
          "review_count",
          "opening_hours",
          "business_status",
        ],
      },
    },
    requested_result_count: {
      type: "INTEGER",
    },
    export_format: {
      type: "STRING",
      enum: ["excel", "pdf", "both"],
    },
  },
  required: ["category", "location", "filters", "fields"],
};

/**
 * Maps deterministic query parser output to a structured SearchPlan.
 */
function mapSearchQueryToPlan(query: string, parsed: SearchQuery): SearchPlan {
  const countMatch = query.match(/\b(\d+)\b/);
  const count = countMatch ? parseInt(countMatch[1], 10) : null;

  let exportFormat: "excel" | "pdf" | "both" | null = null;
  const qLower = query.toLowerCase();
  if (qLower.includes("excel") || qLower.includes("xlsx") || qLower.includes("csv")) {
    exportFormat = "excel";
  } else if (qLower.includes("pdf") || qLower.includes("report")) {
    exportFormat = "pdf";
  }

  const fields: FieldName[] = (parsed.requested_fields || [
    "business_name",
    "category",
    "address",
    "phone",
    "website",
    "rating",
  ]) as FieldName[];

  // Ensure core fields are always requested
  if (!fields.includes("business_name")) fields.push("business_name");
  if (!fields.includes("address")) fields.push("address");
  if (!fields.includes("phone")) fields.push("phone");
  if (!fields.includes("website")) fields.push("website");

  return {
    category: parsed.category || "business",
    location: {
      country: parsed.location.country || "Pakistan",
      province: parsed.location.state || undefined,
      city: parsed.location.city || undefined,
      housing_society: parsed.location.area || undefined,
      confidence: 0.8,
      confident: true,
      preposition: "in",
    },
    filters: {},
    fields,
    requested_result_count: count,
    export_format: exportFormat,
    original_query: query,
  };
}

/**
 * Calls Gemini to plan the structured search request, falling back deterministically.
 */
export async function parseQueryWithGemini(query: string): Promise<SearchPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Falling back to deterministic query parser.");
    const parsed = parseQuery(query);
    return mapSearchQueryToPlan(query, parsed);
  }

  try {
    const prompt = `${SYSTEM_INSTRUCTION}\n\nReturn only the structured SearchPlan for this user request:\n${query}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SEARCH_PLAN_SCHEMA,
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      throw new Error("Gemini returned an empty structured response.");
    }

    const plan = JSON.parse(textResult) as SearchPlan;
    plan.original_query = query;
    return plan;

  } catch (error) {
    console.error("Gemini query parsing failed, falling back to deterministic parser:", error);
    const parsed = parseQuery(query);
    return mapSearchQueryToPlan(query, parsed);
  }
}
