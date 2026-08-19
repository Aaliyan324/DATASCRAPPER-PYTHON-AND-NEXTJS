import { z } from "zod";

// ============================================================
// Zod Validation Schema for structured search query
// ============================================================
export const SearchQuerySchema = z.object({
  intent: z.enum([
    "business_search",
    "unsupported",
    "clarification_required"
  ]),
  category: z.string().nullable(),
  location: z.object({
    query: z.string().nullable(),
    country: z.string().nullable(),
    state: z.string().nullable(),
    city: z.string().nullable(),
    area: z.string().nullable()
  }),
  filters: z.object({
    min_price: z.number().nullable(),
    max_price: z.number().nullable(),
    min_rating: z.number().nullable()
  }),
  requested_fields: z.array(
    z.enum([
      "business_name",
      "category",
      "address",
      "area",
      "city",
      "phone",
      "email",
      "website",
      "rating",
      "price",
      "opening_hours",
      "review_count",
      "latitude",
      "longitude"
    ])
  ),
  keywords: z.array(z.string())
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

const DEFAULT_FIELDS: SearchQuery["requested_fields"] = [
  "business_name",
  "category",
  "address",
  "city",
  "phone",
  "website",
  "rating"
];

// ============================================================
// CATEGORY SYNONYMS
// ============================================================
const CATEGORY_MAP: Record<string, string[]> = {
  restaurant: [
    "restaurant", "restaurants", "resturent", "resuturant", "resturants",
    "restrant", "food place", "food places", "dining", "dining place",
    "dining places", "eatery", "eateries", "diner", "fast food",
    "fastfood", "pizza place",
    "ریسٹورنٹ", "کھانے", "کھانے کی جگہ"
  ],
  hotel: [
    "hotel", "hotels", "hotle", "hotal", "lodging", "inn", "motel",
    "guest house", "accommodation",
    "ہوٹل", "رہائش"
  ],
  school: [
    "school", "schools", "sakool", "skool", "academy", "academies",
    "سکول", "تعلیمی", "مدرسہ"
  ],
  cafe: [
    "cafe", "cafes", "kafe", "cafi", "coffee shop", "coffee",
    "چائے", "کیفے"
  ],
  "real estate agency": [
    "real estate", "agency", "agent", "property", "properties",
    "real estate agency", "realtor", "realtors", "dealer", "dealers",
    "پراپرٹی", "ایجنسی"
  ],
  gym: [
    "gym", "gyms", "fitness", "fitness center", "جم", "gim", "jym"
  ],
  hospital: [
    "hospital", "hospitals", "medical center",
    "ہسپتال"
  ],
  clinic: [
    "clinic", "clinics",
    "کلینک"
  ],
  pharmacy: [
    "pharmacy", "pharmacies", "chemist", "drugstore", "medical store",
    "فارمیسی", "دوا"
  ],
  dentist: [
    "dentist", "dentists", "dental clinic", "dental",
    "دندان ساز"
  ],
  doctor: [
    "doctor", "doctors", "physician",
    "ڈاکٹر"
  ],
  bank: [
    "bank", "banks",
    "بینک"
  ],
  supermarket: [
    "supermarket", "supermarkets", "grocery", "groceries", "store",
    "سپر مارکیٹ"
  ],
  salon: [
    "salon", "salons", "barber", "barbershop", "hair salon", "beauty salon",
    "بیوٹی سیلون"
  ],
  college: [
    "college", "colleges", "institute",
    "کالج"
  ],
  university: [
    "university", "universities",
    "یونیورسٹی"
  ],
  mosque: [
    "mosque", "mosques", "masjid",
    "مسجد"
  ],
  church: [
    "church", "churches"
  ],
  "software house": [
    "software house", "software company", "software companies",
    "it company", "tech company", "software firm", "software houses"
  ],
  bakery: [
    "bakery", "bakeries",
    "بیکری"
  ],
};

// ============================================================
// CITY / LOCATION DATA
// ============================================================
interface CityInfo {
  city: string;
  country: string;
  aliases: string[];
}

const CITIES: CityInfo[] = [
  { city: "Lahore", country: "Pakistan", aliases: ["lahore", "لاہور"] },
  { city: "Karachi", country: "Pakistan", aliases: ["karachi", "کراچی"] },
  { city: "Islamabad", country: "Pakistan", aliases: ["islamabad", "اسلام آباد", "اسلام اباد"] },
  { city: "Rawalpindi", country: "Pakistan", aliases: ["rawalpindi", "pindi", "راولپنڈی"] },
  { city: "Gujrat", country: "Pakistan", aliases: ["gujrat", "گجرات"] },
  { city: "Gujranwala", country: "Pakistan", aliases: ["gujranwala", "گجرانوالہ"] },
  { city: "Faisalabad", country: "Pakistan", aliases: ["faisalabad", "فیصل آباد", "فیصل اباد"] },
  { city: "Sialkot", country: "Pakistan", aliases: ["sialkot", "سیالکوٹ"] },
  { city: "Peshawar", country: "Pakistan", aliases: ["peshawar", "پشاور"] },
  { city: "Multan", country: "Pakistan", aliases: ["multan", "ملتان"] },
  { city: "Mumbai", country: "India", aliases: ["mumbai", "bombay"] },
  { city: "Delhi", country: "India", aliases: ["delhi", "new delhi"] },
  { city: "Gujarat", country: "India", aliases: ["gujarat"] },
  { city: "Hyderabad", country: "Pakistan", aliases: ["hyderabad"] },
  { city: "Quetta", country: "Pakistan", aliases: ["quetta"] },
  { city: "Abbottabad", country: "Pakistan", aliases: ["abbottabad"] },
  { city: "Murree", country: "Pakistan", aliases: ["murree"] },
  { city: "Bahawalpur", country: "Pakistan", aliases: ["bahawalpur"] },
  { city: "Sargodha", country: "Pakistan", aliases: ["sargodha"] },
  { city: "Sukkur", country: "Pakistan", aliases: ["sukkur"] },
];

// ============================================================
// FIELD SYNONYMS
// ============================================================
const FIELD_PATTERNS: { field: SearchQuery["requested_fields"][number]; patterns: string[] }[] = [
  {
    field: "phone",
    patterns: ["phone", "number", "contact", "contact number", "mobile", "call", "فون", "نمبر", "رابطہ", "fon", "nambar", "numbar"]
  },
  {
    field: "website",
    patterns: ["website", "url", "site", "web", "ویب", "سائٹ", "wabsait"]
  },
  {
    field: "address",
    patterns: ["address", "location", "where", "street", "پتہ", "ایڈریس", "pata", "patta"]
  },
  {
    field: "rating",
    patterns: ["rating", "ratings", "stars", "review", "reviews", "سٹار", "ستارے", "star"]
  },
  {
    field: "price",
    patterns: ["price", "cost", "قیمت", "روپے", "rupey", "rupai"]
  },
  {
    field: "email",
    patterns: ["email", "e-mail", "mail", "ای میل"]
  },
  {
    field: "opening_hours",
    patterns: ["hours", "timing", "opening hours", "schedule", "اوقات"]
  },
  {
    field: "review_count",
    patterns: ["review count", "number of reviews", "how many reviews"]
  },
];

// ============================================================
// UNSUPPORTED QUERY DETECTION
// ============================================================
const UNSUPPORTED_PATTERNS = [
  "write", "code", "game", "poem", "essay", "make a", "how to build",
  "create a", "build me", "program", "script", "function",
];

// ============================================================
// MAIN PARSER
// ============================================================

/**
 * Deterministic natural-language query parser.
 *
 * Converts human-readable search commands into structured parameters
 * without any AI or LLM dependency. Supports English, Urdu, and Roman Urdu.
 */
export function parseQuery(command: string): SearchQuery {
  const cmd = command.toLowerCase().trim();

  // 1. Check for unsupported requests
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (cmd.includes(pattern)) {
      return {
        intent: "unsupported",
        category: null,
        location: { query: null, country: null, state: null, city: null, area: null },
        filters: { min_price: null, max_price: null, min_rating: null },
        requested_fields: [],
        keywords: []
      };
    }
  }

  // 2. Identify category
  let category: string | null = null;
  const keywords: string[] = [];

  for (const [catName, synonyms] of Object.entries(CATEGORY_MAP)) {
    for (const syn of synonyms) {
      if (cmd.includes(syn.toLowerCase())) {
        category = catName;
        keywords.push(catName);
        break;
      }
    }
    if (category) break;
  }

  // 3. Identify location
  let city: string | null = null;
  let country: string | null = null;
  let queryLoc: string | null = null;

  for (const cityInfo of CITIES) {
    for (const alias of cityInfo.aliases) {
      if (cmd.includes(alias.toLowerCase())) {
        city = cityInfo.city;
        country = cityInfo.country;
        queryLoc = `${cityInfo.city}, ${cityInfo.country}`;
        break;
      }
    }
    if (city) break;
  }

  // 4. Clarification flow
  if (category && !queryLoc) {
    return {
      intent: "clarification_required",
      category,
      location: { query: null, country: null, state: null, city: null, area: null },
      filters: { min_price: null, max_price: null, min_rating: null },
      requested_fields: [],
      keywords: []
    };
  }

  if (!category && !queryLoc) {
    return {
      intent: "clarification_required",
      category: null,
      location: { query: null, country: null, state: null, city: null, area: null },
      filters: { min_price: null, max_price: null, min_rating: null },
      requested_fields: [],
      keywords: []
    };
  }

  // 5. Identify filters (price limits and ratings)
  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  let minRating: number | null = null;

  const maxPriceMatch = cmd.match(
    /(?:under|below|max|rs\.?|rupees?|کم|سستا|sasta|kam|budget|cheap)\s*(\d+)/i
  );
  if (maxPriceMatch?.[1]) {
    maxPrice = parseInt(maxPriceMatch[1], 10);
  }

  // Detect "cheap" / "budget" / "affordable" as a low-price indicator
  if (
    !maxPrice &&
    (cmd.includes("cheap") || cmd.includes("budget") || cmd.includes("affordable") ||
     cmd.includes("low cost") || cmd.includes("سستا") || cmd.includes("sasta"))
  ) {
    // Set a flag in keywords; the Python side can interpret this
    keywords.push("cheap");
  }

  const ratingMatch = cmd.match(
    /(?:rating|rated|above|min|سٹار|ستارے|star|stars|se ziyada|se upar)\s*([1-5]\.?\d?)/i
  );
  if (ratingMatch?.[1]) {
    minRating = parseFloat(ratingMatch[1]);
  }

  // Also check for "above X stars" pattern
  if (!minRating) {
    const aboveStarsMatch = cmd.match(/(?:above|over|more than|زیادہ)\s*([1-5]\.?\d?)\s*(?:star|stars|rating|سٹار)/i);
    if (aboveStarsMatch?.[1]) {
      minRating = parseFloat(aboveStarsMatch[1]);
    }
  }

  // 6. Identify requested fields
  const reqFields: SearchQuery["requested_fields"] = ["business_name", "category"];
  for (const { field, patterns } of FIELD_PATTERNS) {
    for (const pattern of patterns) {
      if (cmd.includes(pattern.toLowerCase())) {
        if (!reqFields.includes(field)) {
          reqFields.push(field);
        }
        break;
      }
    }
  }

  // If user didn't specify specific fields, use defaults
  if (reqFields.length <= 2) {
    reqFields.push("phone", "website", "rating", "address", "city");
  }

  return {
    intent: "business_search",
    category: category || "business",
    location: {
      query: queryLoc || "Pakistan",
      country: country || "Pakistan",
      state: null,
      city: city,
      area: null
    },
    filters: {
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating
    },
    requested_fields: reqFields,
    keywords: keywords.length > 0 ? keywords : ["directory"]
  };
}
