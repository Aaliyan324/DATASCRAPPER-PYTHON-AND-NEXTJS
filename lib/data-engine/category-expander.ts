import { CATEGORY_SYNONYMS } from "./constants";

/**
 * Static fallback synonym map for common Pakistani business categories.
 * Used when Gemini AI is unavailable.
 */
const STATIC_SYNONYMS: Record<string, string[]> = {
  "mobile shop": ["mobile phone store", "cell phone store", "smartphone store", "mobile accessories"],
  "mobile shops": ["mobile phone stores", "cell phone stores", "smartphone stores"],
  "restaurant": ["food", "dining", "eatery", "diner", "food restaurant"],
  "restaurants": ["food places", "dining places", "eateries"],
  "pharmacy": ["medical store", "chemist", "medicine shop", "drugstore"],
  "pharmacies": ["medical stores", "chemists", "medicine shops"],
  "grocery store": ["grocery", "kirana store", "general store", "supermarket", "mini mart"],
  "grocery stores": ["groceries", "kirana stores", "general stores", "supermarkets"],
  "clothing shop": ["clothing store", "garments shop", "fashion store", "boutique", "dress shop"],
  "clothing shops": ["clothing stores", "garments shops", "fashion stores", "boutiques"],
  "electronics shop": ["electronics store", "electrical shop", "appliance store"],
  "electronics shops": ["electronics stores", "electrical shops", "appliance stores"],
  "hardware store": ["hardware shop", "building materials", "construction supplies"],
  "hardware stores": ["hardware shops", "building materials", "construction supplies"],
  "auto repair": ["mechanic", "auto workshop", "car repair", "garage", "vehicle repair"],
  "auto repair shop": ["mechanic shop", "auto workshop", "car garage", "vehicle repair shop"],
  "salon": ["beauty salon", "beauty parlour", "hair salon", "barber shop"],
  "salons": ["beauty salons", "beauty parlours", "hair salons", "barber shops"],
  "bakery": ["bakery shop", "bread shop", "cake shop", "pastry shop"],
  "bakeries": ["bakery shops", "bread shops", "cake shops", "pastry shops"],
  "school": ["educational institution", "academy", "madrasa", "college"],
  "schools": ["educational institutions", "academies", "colleges"],
  "hospital": ["medical center", "clinic", "health center", "healthcare"],
  "hospitals": ["medical centers", "clinics", "health centers"],
  "gas station": ["petrol pump", "fuel station", "petrol station", "CNG station"],
  "gas stations": ["petrol pumps", "fuel stations", "petrol stations"],
  "real estate": ["property dealer", "estate agent", "property agent", "housing"],
  "real estate agency": ["property dealer", "estate agent", "property agent"],
  "lawyer": ["advocate", "attorney", "legal consultant", "law firm"],
  "lawyers": ["advocates", "attorneys", "legal consultants", "law firms"],
  "doctor": ["physician", "medical specialist", "clinic doctor", "consultant"],
  "doctors": ["physicians", "medical specialists", "consultants"],
  "dentist": ["dental clinic", "dental surgeon", "tooth doctor"],
  "dentists": ["dental clinics", "dental surgeons"],
  "gym": ["fitness center", "fitness gym", "health club", "workout center"],
  "gyms": ["fitness centers", "fitness gyms", "health clubs"],
  "hotel": ["lodging", "guest house", "guesthouse", "motel"],
  "hotels": ["lodging", "guest houses", "motels"],
  "cafe": ["coffee shop", "coffee house", "tea cafe", "chai cafe"],
  "cafes": ["coffee shops", "coffee houses", "tea cafes"],
  "butcher shop": ["butcher", "meat shop", "meat store"],
  "butcher shops": ["butchers", "meat shops", "meat stores"],
  "sweet shop": ["mithai shop", "sweet store", "confectionery", "dessert shop"],
  "sweet shops": ["mithai shops", "sweet stores", "confectioneries"],
  "stationery": ["stationery shop", "bookshop", "book store", "paper shop"],
  "stationery shop": ["stationery store", "bookshop", "book store"],
  "furniture": ["furniture shop", "furniture store", "furniture market"],
  "furniture shop": ["furniture store", "furniture showroom"],
  "jewelry": ["jewellery", "jeweler", "jewellery shop", "gold shop"],
  "jewelry shop": ["jewellery store", "jeweler shop", "gold shop"],
  "tailor": ["tailor shop", "sewing shop", "stitching", "darzi"],
  "tailors": ["tailor shops", "sewing shops", "stitching shops"],
  "photographer": ["photography studio", "photo studio", "photography"],
  "photographers": ["photography studios", "photo studios"],
  "car dealer": ["car showroom", "auto dealer", "vehicle dealer", "used car"],
  "car dealers": ["car showrooms", "auto dealers", "vehicle dealers"],
  "bike shop": ["motorcycle shop", "bike dealer", "motorcycle dealer"],
  "bike shops": ["motorcycle shops", "bike dealers"],
  "pet shop": ["pet store", "animal shop", "pet supplies"],
  "pet shops": ["pet stores", "animal shops"],
  "sports shop": ["sports store", "sportswear", "sports equipment"],
  "sports shops": ["sports stores", "sportswear shops"],
  "wedding hall": ["banquet hall", "marriage hall", "event venue", "function hall"],
  "wedding halls": ["banquet halls", "marriage halls", "event venues"],
};

/**
 * Expands a category into semantically relevant search variations.
 * Uses static synonym map as primary source; can be extended with Gemini AI.
 *
 * @param category - The original category from the search plan
 * @param useAI - Whether to attempt AI-based expansion (future enhancement)
 * @returns Array of category variations for multi-pass search
 */
export function expandCategory(category: string, useAI = false): string[] {
  const lower = category.toLowerCase().trim();

  // Check static synonyms first
  const staticSynonyms = STATIC_SYNONYMS[lower];
  if (staticSynonyms) {
    return [category, ...staticSynonyms];
  }

  // Check existing CATEGORY_SYNONYMS from constants
  const existingSynonyms = CATEGORY_SYNONYMS[lower];
  if (existingSynonyms && existingSynonyms.length > 0) {
    return [category, ...existingSynonyms];
  }

  // Fallback: generate simple variations
  const variations: string[] = [category];

  // Add plural/singular
  if (lower.endsWith("s")) {
    variations.push(lower.slice(0, -1)); // "shops" -> "shop"
  } else {
    variations.push(`${lower}s`); // "shop" -> "shops"
  }

  // Add "shop/store" suffix variations
  if (!lower.includes("shop") && !lower.includes("store") && !lower.includes("center")) {
    variations.push(`${lower} shop`);
    variations.push(`${lower} store`);
  }

  return [...new Set(variations)];
}

/**
 * Expands category using Gemini AI for semantic variations.
 * Falls back to static expansion if AI is unavailable.
 */
export async function expandCategoryWithAI(category: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return expandCategory(category);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate 4-6 alternative search terms for finding "${category}" businesses in Pakistan on Google Maps. Include common local variations, colloquial names, and related terms that people in Pakistan would use. Return ONLY a JSON array of strings, no other text. Example: ["term1", "term2", "term3"]`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            responseMimeType: "application/json",
          }
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[CategoryExpander] Gemini API returned ${response.status}, falling back to static`);
      return expandCategory(category);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return expandCategory(category);

    const aiTerms: string[] = JSON.parse(text);
    const combined = [category, ...aiTerms];
    return [...new Set(combined.map(t => t.trim()).filter(Boolean))];
  } catch (err) {
    console.warn("[CategoryExpander] AI expansion failed, using static fallback:", err);
    return expandCategory(category);
  }
}
