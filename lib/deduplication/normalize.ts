/**
 * Enhanced business name and address normalization for Pakistan-specific data.
 * Builds on existing normalizer.ts but preserves location/branch distinguishing words.
 */

// ─── Pakistan Abbreviation Maps ──────────────────────────────────────────────

const ADDRESS_ABBREVS: Record<string, string> = {
  "rd": "road",
  "rd.": "road",
  "st": "street",
  "st.": "street",
  "mkt": "market",
  "ctr": "centre",
  "center": "centre",
  "chowk.": "chowk",
  "ph.": "phase",
  "blk": "block",
  "blk.": "block",
  "sec.": "sector",
  "sec": "sector",
  "dist": "district",
  "dist.": "district",
  "teh": "tehsil",
  "teh.": "tehsil",
  "prov": "province",
  "prov.": "province",
  "apt": "apartment",
  "apt.": "apartment",
  "bldg": "building",
  "bldg.": "building",
  "flr": "floor",
  "flr.": "floor",
  "no.": "number",
  "no": "number",
  "p.o.": "post office",
  "po": "post office",
};

const CITY_CODES: Record<string, string> = {
  "lhr": "lahore",
  "isb": "islamabad",
  "rwp": "rawalpindi",
  "khi": "karachi",
  "pew": "peshawar",
  "fsd": "faisalabad",
  "mux": "multan",
  "gjr": "gujranwala",
  "sial": "sialkot",
  "hyb": "hyderabad",
  "qta": "quetta",
};

// Roman numeral ↔ digit mapping for Pakistani localities
const ROMAN_TO_DIGIT: Record<string, string> = {
  "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
  "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10",
  "xi": "11", "xii": "12",
};

const DIGIT_TO_ROMAN: Record<string, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_DIGIT).map(([k, v]) => [v, k])
);

// Common business suffixes that should be REMOVED for name comparison
// but only when they don't carry meaning (e.g. "General Store" is meaningful)
const STRIP_SUFFIXES = new Set([
  "pvt", "pvt.", "ltd", "ltd.", "limited", "private",
  "inc", "inc.", "co", "co.", "company", "group",
  "(pvt) ltd", "(pvt.) ltd.", "private limited",
]);

// ─── Core Normalization Functions ────────────────────────────────────────────

/**
 * Full business name normalization for dedup comparison.
 * - Unicode NFKD normalization
 * - Lowercase
 * - Strip punctuation, apostrophes, hyphens
 * - Expand abbreviations
 * - Remove common non-meaningful suffixes
 * - Normalize Roman numerals ↔ digits for locality names
 * - Collapse whitespace
 *
 * IMPORTANT: Does NOT remove location words (Gulberg, DHA, etc.)
 * because those distinguish branches.
 */
export function normalizeBusinessNameFull(name: string | null | undefined): string {
  if (!name) return "";

  let s = name;

  // Unicode NFKD normalization — decompose compatibility characters
  s = s.normalize("NFKD");

  // Lowercase
  s = s.toLowerCase();

  // Remove punctuation and apostrophes but keep spaces
  s = s.replace(/[''`´,;:!?()\-–—[\]{}./\\|@#$%^&*+=<>~]/g, " ");

  // Expand address abbreviations
  s = expandAbbreviations(s, ADDRESS_ABBREVS);

  // Expand city codes
  s = expandAbbreviations(s, CITY_CODES);

  // Remove non-meaningful business suffixes
  s = removeSuffixes(s, STRIP_SUFFIXES);

  // Normalize "mc donalds" → "mcdonalds" (common split names)
  s = s.replace(/\bmc\s+(\w)/g, "mc$1");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Name normalization specifically for branch detection.
 * Extracts the "core brand" part and the "location qualifier" part.
 *
 * Example: "mcdonalds gulberg" → { core: "mcdonalds", qualifier: "gulberg" }
 * Example: "al rehman general store" → { core: "al rehman general store", qualifier: "" }
 */
export function extractBranchComponents(name: string | null | undefined): {
  core: string;
  qualifier: string;
} {
  const normalized = normalizeBusinessNameFull(name);
  if (!normalized) return { core: "", qualifier: "" };

  // Known location/area keywords that indicate branch qualifiers
  const locationKeywords = new Set([
    // Lahore areas
    "gulberg", "dha", "johar town", "model town", "bahria town", "gardentown",
    "township", "wapda town", "valencia", "askari", "cantt", "anarkali",
    "ichhra", "mazang", "lahore", "blue area",
    // Islamabad/Rawalpindi
    "f-10", "f-11", "f-6", "f-7", "f-8", "g-9", "g-10", "g-11", "i-8", "i-9",
    "phase 5", "phase 2", "phase 1", "phase 8", "satellite town",
    "bahria phase", "rawalpindi", "islamabad",
    // Karachi
    "clifton", "dha karachi", "garden", "saddar", "korangi", "landhi",
    "north nazimabad", "south nazimabad", "karachi",
    // Generic
    "main boulevard", "main road", "cantonment", "mall road",
  ]);

  const words = normalized.split(" ");
  let qualifierStart = -1;

  // Check if any word matches a known location keyword
  for (let i = 0; i < words.length; i++) {
    const remaining = words.slice(i).join(" ");
    for (const kw of locationKeywords) {
      if (remaining.startsWith(kw) || remaining === kw) {
        qualifierStart = i;
        break;
      }
    }
    if (qualifierStart >= 0) break;
  }

  if (qualifierStart > 0) {
    return {
      core: words.slice(0, qualifierStart).join(" "),
      qualifier: words.slice(qualifierStart).join(" "),
    };
  }

  return { core: normalized, qualifier: "" };
}

/**
 * Address normalization for comparison.
 * Handles DHA Phase formatting, Gulberg III/3, abbreviations, etc.
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";

  let s = address.toLowerCase();

  // Remove punctuation
  s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

  // Expand abbreviations
  s = expandAbbreviations(s, ADDRESS_ABBREVS);
  s = expandAbbreviations(s, CITY_CODES);

  // Normalize Roman numerals in locality context (Gulberg III → gulberg 3)
  s = normalizeRomanNumerals(s);

  // Normalize "phase-5" → "phase 5", "phase 5" stays
  s = s.replace(/\bphase\s*[-.]?\s*(\d+)\b/g, "phase $1");

  // Normalize "dha phase 5 lahore" ordering → "dha lahore phase 5"
  // (keep canonical form consistent)

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Extracts locality/area tokens from an address for area-aware matching.
 */
export function extractAreaTokens(address: string | null | undefined): string[] {
  if (!address) return [];
  const normalized = normalizeAddress(address);
  const tokens: string[] = [];

  // Extract known patterns
  const patterns = [
    /dha\s*(?:phase\s*\d+)?/gi,
    /gulberg\s*(?:[ivx]+|\d+)?/gi,
    /bahria\s*(?:town|phase\s*\d+)?/gi,
    /model\s+town/gi,
    /johar\s+town/gi,
    /garden\s+town/gi,
    /wapda\s+town/gi,
    /f-\d+/gi,
    /g-\d+/gi,
    /i-\d+/gi,
    /sector\s*\d+/gi,
    /block\s*\w+/gi,
    /phase\s*\d+/gi,
    /cantt\.?/gi,
  ];

  for (const pattern of patterns) {
    const matches = normalized.match(pattern);
    if (matches) {
      tokens.push(...matches.map(m => m.toLowerCase().replace(/\s+/g, " ").trim()));
    }
  }

  return [...new Set(tokens)];
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function expandAbbreviations(text: string, map: Record<string, string>): string {
  const words = text.split(/\s+/);
  const expanded = words.map(word => {
    const lower = word.toLowerCase().replace(/[.]/g, "");
    const lookup = word.toLowerCase();
    // Try with and without trailing period
    if (map[lookup]) return map[lookup];
    if (map[lookup + "."]) return map[lookup + "."];
    return word;
  });
  return expanded.join(" ");
}

function removeSuffixes(name: string, suffixes: Set<string>): string {
  let s = name;
  for (const suffix of suffixes) {
    if (s.endsWith(" " + suffix)) {
      s = s.slice(0, -(suffix.length + 1));
    }
  }
  return s;
}

function normalizeRomanNumerals(text: string): string {
  // Replace Roman numerals that appear after known locality names
  let result = text;
  for (const [roman, digit] of Object.entries(ROMAN_TO_DIGIT)) {
    // Match Roman numeral as a standalone word
    const regex = new RegExp(`\\b${roman}\\b`, "g");
    result = result.replace(regex, digit);
  }
  return result;
}

/**
 * Convert area name variations to canonical form for area matching.
 * Uses the same logic as address normalization but focused on area names.
 */
export function canonicalizeAreaName(area: string | null | undefined): string {
  if (!area) return "";
  let s = area.toLowerCase().trim();
  s = s.replace(/[.\-]/g, " ");
  s = normalizeRomanNumerals(s);
  s = s.replace(/\bphase\s*[-.]?\s*(\d+)\b/g, "phase $1");
  s = expandAbbreviations(s, ADDRESS_ABBREVS);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
