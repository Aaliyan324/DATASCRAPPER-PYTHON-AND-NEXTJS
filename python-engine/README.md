# Pakistan Data Engine — Python MVP

A terminal-first, Pakistan-focused data intelligence engine:

**Natural language → Gemini structured SearchPlan → Google Places API → normalization → deduplication → validation → Excel/PDF**

It supports English, Roman Urdu, and mixed requests such as:

- `Find hotels in Okara`
- `Okara main hotels dhundo`
- `Sahiwal mein private schools ke phone numbers aur websites chahiye`
- `Okara main 50 schools find karo aur Excel mein save karo`

## 1. Requirements

- Python 3.11+
- A Gemini API key
- A Google Maps Platform API key with Places API (New) enabled
- A Google Cloud billing setup appropriate for your Places usage

This project uses the current Places API (New) Text Search endpoint and explicit field masks.

## 2. Setup

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Put your credentials in `.env`:

```env
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env`.

## 3. Run

Interactive:

```powershell
python main.py
```

Direct:

```powershell
python main.py "Okara main private schools ke phone numbers aur websites chahiye"
```

## 4. Architecture

```text
CLI
  ↓
QueryParser
  ↓
Gemini structured SearchPlan (Pydantic)
  ↓
PakistanLocationResolver
  ↓
SearchEngine
  ↓
SearchStrategy
  ↓
GooglePlacesClient
  ↓
Normalization
  ↓
Deduplication
  ↓
Validation / quality metrics
  ↓
Excel / PDF
```

The core search engine returns `List[PlaceRecord]`, so a later FastAPI adapter can call the same engine without moving scraping/search logic into a frontend.

## 5. Important factual-data rule

Gemini never generates business records. It only interprets the user's request.

All factual place data comes from Google Places API. Missing fields stay missing and are shown as `Not publicly available`.

## 6. Search coverage

Google Text Search is not an exhaustive census of every place in a district. The engine intentionally uses multiple query variants for small Pakistani locations and deduplicates the combined results.

The CLI should say "found X unique places from available sources", not "every business in the district".

## 7. Private/public limitation

Google Places does not provide a universal `ownership=private/public` field. A request such as `private schools` is therefore used to build targeted search queries, but the engine must not claim that Google has independently verified ownership unless the returned source data actually supports it.

Likewise, "cheap restaurants" should not be interpreted as a factual affordability guarantee unless the Places response contains an appropriate price-level field.

## 8. Google API notes

The Places API (New) requires response field masks. The client therefore requests only fields needed by the SearchPlan plus core identity fields.

Text Search results are paginated, but Google documents a maximum result window per Text Search query. Multiple query variants improve practical coverage but do not guarantee completeness.

## 9. Tests

```powershell
pytest
```

## 10. Future FastAPI migration

Keep the CLI as a thin interface. A future backend can expose:

```python
records, stats = SearchEngine().search(plan)
```

without adding scraping logic to Next.js.
