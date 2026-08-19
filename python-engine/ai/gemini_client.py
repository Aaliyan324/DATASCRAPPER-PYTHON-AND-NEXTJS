from google import genai
from google.genai import types

from config import settings
from ai.schemas import SearchPlan


SYSTEM_INSTRUCTION = """
You are the intent parser for a Pakistan-focused place-data engine.

Your ONLY job is to convert a user's natural-language request into the supplied
SearchPlan schema. Never invent businesses, phone numbers, websites, ratings,
addresses, or other factual place records.

Understand English, Roman Urdu, and mixed English/Roman Urdu. Be tolerant of
spelling variants and ungrammatical input.

Pakistan-first rules:
- Resolve locations against Pakistan.
- Recognize province, division, district, tehsil, city, locality, neighborhood,
  and landmark where possible.
- Prefer a known Pakistani location over a similarly named foreign location.
- If the location is genuinely ambiguous, set confident=false and explain why.
- "main/mein/me" commonly marks location context.
- "ke/ki/ka" commonly marks possessive/relationship context.
- "dhundo/dhoondo/dhoondho/talash karo/find karo" means search.
- "nikal do/nikaal do/batao/batado" means retrieve/provide.
- "chahiye/chaheye" means requested information.
- "list bana do/list do/data chahiye/information chahiye" means list/data intent.

Field rules:
- ALWAYS include phone and website in the fields list, as these are core data
  fields that must always be retrieved from Google Places.
- Always include business_name and address as core fields.
- If the user explicitly asks for phone, include phone.
- If explicitly asks for website, include website.
- "complete information" means the extended default set.
- If the user asks for a count, set requested_result_count.
- Detect export requests for Excel/PDF/both.

Filters:
- Capture explicit constraints such as private, public, cheap,
  inexpensive, open now, etc.
- For "private schools", use ownership=private.
- Do not claim that a filter is verified unless the downstream source
  provides evidence.

Category examples:
hotel/hotels -> hotel
school/schools -> school
college/colleges -> college
university/universities -> university
hospital/hospitals -> hospital
restaurant/restaurants -> restaurant

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
                "country": {
                    "type": "string"
                },
                "province": {
                    "type": "string",
                    "nullable": True
                },
                "division": {
                    "type": "string",
                    "nullable": True
                },
                "district": {
                    "type": "string",
                    "nullable": True
                },
                "tehsil": {
                    "type": "string",
                    "nullable": True
                },
                "city": {
                    "type": "string",
                    "nullable": True
                },
                "locality": {
                    "type": "string",
                    "nullable": True
                },
                "landmark": {
                    "type": "string",
                    "nullable": True
                },
                "confident": {
                    "type": "boolean"
                },
                "confidence_note": {
                    "type": "string",
                    "nullable": True
                }
            },
            "required": [
                "country",
                "province",
                "division",
                "district",
                "tehsil",
                "city",
                "locality",
                "landmark",
                "confident",
                "confidence_note"
            ]
        },
        "filters": {
            "type": "object",
            "properties": {
                "ownership": {
                    "type": "string"
                },
                "price": {
                    "type": "string"
                },
                "status": {
                    "type": "string"
                }
            }
        },
        "fields": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
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
            "enum": [
                "excel",
                "pdf",
                "both"
            ],
            "nullable": True
        }
    },
    "required": [
        "category",
        "location",
        "filters",
        "fields",
        "requested_result_count",
        "export_format"
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