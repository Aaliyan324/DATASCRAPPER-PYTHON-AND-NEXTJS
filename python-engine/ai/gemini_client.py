from google import genai
from google.genai import types

from config import settings
from ai.schemas import SearchPlan


SYSTEM_INSTRUCTION = """
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
"""


# Gemini Developer API-compatible schema.
#
# IMPORTANT:
# Do not use "additionalProperties" here.
#
SEARCH_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "description": "Business/place category, e.g. hotel, school, restaurant."
        },
        "location": {
            "type": "object",
            "properties": {
                "country": {"type": "string"},
                "province": {"type": "string", "nullable": True},
                "division": {"type": "string", "nullable": True},
                "district": {"type": "string", "nullable": True},
                "tehsil": {"type": "string", "nullable": True},
                "city": {"type": "string", "nullable": True},
                "town": {"type": "string", "nullable": True},
                "union_council": {"type": "string", "nullable": True},
                "locality": {"type": "string", "nullable": True},
                "neighborhood": {"type": "string", "nullable": True},
                "village": {"type": "string", "nullable": True},
                "mouza": {"type": "string", "nullable": True},
                "colony": {"type": "string", "nullable": True},
                "basti": {"type": "string", "nullable": True},
                "housing_society": {"type": "string", "nullable": True},
                "phase": {"type": "string", "nullable": True},
                "sector": {"type": "string", "nullable": True},
                "block": {"type": "string", "nullable": True},
                "market": {"type": "string", "nullable": True},
                "bazaar": {"type": "string", "nullable": True},
                "chowk": {"type": "string", "nullable": True},
                "road": {"type": "string", "nullable": True},
                "landmark": {"type": "string", "nullable": True},
                "location_type": {"type": "string", "nullable": True},
                "confidence": {"type": "number"},
                "confident": {"type": "boolean"},
                "confidence_note": {"type": "string", "nullable": True},
                "preposition": {
                    "type": "string",
                    "enum": ["in", "inside", "near", "around"]
                },
                "distance_meters": {"type": "integer", "nullable": True},
            },
            "required": [
                "country", "province", "division", "district", "tehsil",
                "city", "town", "union_council", "locality", "neighborhood",
                "village", "mouza", "colony", "basti", "housing_society",
                "phase", "sector", "block", "market", "bazaar", "chowk",
                "road", "landmark", "location_type", "confidence",
                "confident", "confidence_note", "preposition",
                "distance_meters",
            ]
        },
        "filters": {
            "type": "object",
            "properties": {
                "ownership": {"type": "string"},
                "price": {"type": "string"},
                "status": {"type": "string"}
            }
        },
        "fields": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "business_name", "category", "address", "area",
                    "phone", "website", "google_maps_url", "latitude",
                    "longitude", "rating", "review_count", "opening_hours",
                    "business_status"
                ]
            }
        },
        "requested_result_count": {
            "type": "integer",
            "minimum": 1,
            "maximum": 500,
            "nullable": True
        },
        "export_format": {
            "type": "string",
            "enum": ["excel", "pdf", "both"],
            "nullable": True
        }
    },
    "required": [
        "category", "location", "filters", "fields",
        "requested_result_count", "export_format"
    ]
}


class GeminiClient:

    def __init__(self):
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is missing from .env")

        self.client = genai.Client(
            api_key=settings.gemini_api_key
        )

    def parse(self, user_query: str) -> SearchPlan:

        prompt = (
            SYSTEM_INSTRUCTION
            + "\n\nReturn only the structured SearchPlan for this user request:\n"
            + user_query
        )

        response = self.client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SEARCH_PLAN_SCHEMA,
                temperature=0,
            ),
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty structured response."
            )

        try:
            return SearchPlan.model_validate_json(response.text)

        except Exception as exc:
            raise RuntimeError(
                f"Gemini returned invalid SearchPlan JSON: {exc}\n"
                f"Response: {response.text}"
            ) from exc