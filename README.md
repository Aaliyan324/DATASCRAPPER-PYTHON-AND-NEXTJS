# DataScrapper — Pakistan Business Data Discovery

A production-quality, full-stack web application that extracts structured business data from Google Maps / Google Places API using natural-language search commands. Users type queries like *"restaurants in DHA Phase 6 Lahore with phone numbers"* and receive real, live data in an interactive dashboard with filtering, sorting, and Excel/PDF/CSV exports.

**Runs entirely on Next.js + TypeScript.** No Python. No additional runtime.

---

## Architecture

```text
                    ┌─────────────────────┐
                    │      User           │
                    │ Natural Language    │
                    │ Query               │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Next.js         │
                    │  Route Handler      │
                    │  POST /api/search   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Gemini API         │
                    │  (Query Planning)   │
                    │  + TS Fallback      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Search Orchestrator│
                    │  Geographic Grid    │
                    │  Partitioning       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Google Places API  │
                    │  Text Search (New)  │
                    │  Paginated Batches  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            Normalization          Deduplication
            (Phone/URL/           (Place ID +
             Address)              Multi-field)
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Geo Ranking        │
                    │  (Haversine + QS)   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ PostgreSQL/Prisma   │
                    │ (or JSON fallback)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Next.js Dashboard   │
                    │ Results + Export    │
                    └─────────────────────┘
```

---

## Key Features

1. **Gemini-Powered NL Parser**: Gemini 2.5 Flash converts natural-language queries (English, Urdu, Roman Urdu) into structured `SearchPlan` objects including category, location, filters, and field requirements. Falls back to a deterministic rule-based parser when no API key is set.
2. **Google Places API (New)**: Uses the modern `places.googleapis.com/v1/places:searchText` endpoint with field-mask optimization and paginated batch fetching (up to 60 results per sub-query).
3. **Geographic Grid Partitioning**: For high-volume searches (50+ results) in major Pakistani cities (Lahore, Karachi, Islamabad, etc.), the engine automatically sub-divides the search area into named zones/neighbourhoods and runs parallel queries to achieve 100+ unique results.
4. **Pakistan Location Intelligence**: 2,000+ entry location registry covering all Pakistani cities, tehsils, housing societies (DHA, Bahria Town, Gulberg etc.), sectors (Islamabad F-7, G-11), markets, chowks, Chak numbers, and rural settlement types.
5. **Deduplication**: Place ID matching combined with multi-field compound comparison (name + phone + website + address) prevents duplicate records.
6. **Geo Ranking & Quality Scoring**: Haversine distance ranking, preposition-aware allowed radius (wider for "near", tighter for "in"), and a 0–100 quality completeness score per record.
7. **Interactive Dashboard**:
   - Real-time progress tracker with pipeline stages
   - Metrics cards (records, cities, categories, data coverage)
   - Full data table with sticky headers, sorting, and pagination
   - Advanced filters (city, category, rating, phone/website availability)
   - Detail drawer with full business information
8. **Export**: Client-side Excel (SheetJS), PDF (jsPDF), and CSV downloads.
9. **Job-Based Architecture**: Async search with status tracking (parsing → scraping → completed / error).
10. **Real Data Only**: Every result originates from Google Places. No fake data, no demo seeds.

---

## Technology Stack

**Full-Stack (Next.js)**:
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Lucide React icons, Framer Motion
- Zod for validation
- SheetJS (`xlsx`), jsPDF, jspdf-autotable for exports

**Data Engine (`lib/data-engine/`)**:
- `google-places.ts` — Google Places API (New) Text Search client
- `ai/query-understanding.ts` — Gemini NL → SearchPlan + fallback parser
- `search-orchestrator.ts` — Geographic grid partitioning and batch orchestration
- `normalizer.ts` — Pakistani phone / website / address normalization
- `deduplicator.ts` — Multi-field record deduplication
- `ranking.ts` — Haversine + quality score ranking
- `query-expander.ts` — Synonym maps and query variant generation
- `location-resolver.ts` — Admin hierarchy + Google Geocoding viewport resolution
- `constants.ts` — Pakistan location registry (2,000+ entries)

**Database**:
- PostgreSQL (Supabase) via Prisma ORM 7
- Automatic JSON file fallback when `DATABASE_URL` is not configured (`.data/db.json`)

---

## Project Structure

```text
datascrapper/
├── app/                             # Next.js frontend & API
│   ├── api/
│   │   ├── history/route.ts         # Search history
│   │   └── search/
│   │       ├── route.ts             # Create job, start TS engine
│   │       └── [id]/
│   │           ├── route.ts         # Poll job status
│   │           └── results/route.ts # Get results
│   ├── page.tsx                     # Landing page
│   ├── search/[id]/page.tsx         # Results dashboard
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── gradient-border.tsx          # UI component
├── lib/
│   ├── data-engine/                 # TypeScript search engine
│   │   ├── index.ts                 # Engine entrypoint
│   │   ├── types.ts                 # Core data models
│   │   ├── constants.ts             # Pakistan location registry
│   │   ├── google-places.ts         # Places API (New) client
│   │   ├── normalizer.ts            # Phone/URL normalization
│   │   ├── deduplicator.ts          # Record deduplication
│   │   ├── ranking.ts               # Geo + quality ranking
│   │   ├── query-expander.ts        # Query variant generation
│   │   ├── location-resolver.ts     # Geocoding + hierarchy
│   │   ├── search-orchestrator.ts   # Batch orchestration
│   │   └── ai/
│   │       └── query-understanding.ts  # Gemini NL parser
│   ├── query-parser.ts              # Deterministic NL parser fallback
│   ├── db.ts                        # Prisma + JSON fallback DB layer
│   ├── exporter.ts                  # Excel, PDF, CSV exporters
│   └── normalization.ts             # Legacy normalization utilities
├── prisma/
│   └── schema.prisma                # PostgreSQL models
└── .env.example                     # Required environment variables
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Aaliyan324/DATASCRAPPER-PYTHON-AND-NEXTJS.git
cd DATASCRAPPER-PYTHON-AND-NEXTJS
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required: Google Maps Platform API Key
# Enable: Places API (New), Geocoding API
GOOGLE_MAPS_API_KEY=your_key_here

# Optional: Gemini API key for enhanced NL query understanding
# Falls back to deterministic parser if not set
GEMINI_API_KEY=your_key_here

# Optional: PostgreSQL connection string
# Falls back to local .data/db.json if not set
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | **Yes** | Google Maps Platform key. Must have Places API (New) and Geocoding API enabled. |
| `GEMINI_API_KEY` | No | Gemini API key. Enables advanced NL query parsing. Falls back to deterministic parser if absent. |
| `GEMINI_MODEL` | No | Gemini model to use. Defaults to `gemini-2.5-flash`. |
| `DATABASE_URL` | No | PostgreSQL connection string. Defaults to local JSON file at `.data/db.json`. |

---

## Example Queries

| Query | What it does |
|---|---|
| `hotels in DHA Phase 6 Lahore` | Grid-partitioned search for hotels in DHA Phase 6 |
| `restaurants near F-7/2 Islamabad` | Radius search around F-7/2 sub-sector |
| `schools in Sahiwal` | School search across all Sahiwal zones |
| `hospitals in Karachi` | Multi-zone hospital search across Karachi |
| `pharmacies in Gulberg Greens Block A` | Block-level micro-locality search |
| `100 cafes in Lahore` | Requests 100 results, triggers geographic partitioning |
| `private schools in Model Town Lahore` | Category + ownership filter + locality |

---

## Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable billing
3. Enable: **Places API (New)** and **Geocoding API**
4. Create an API key and restrict it to your domain / IP
5. Set `GOOGLE_MAPS_API_KEY` in your `.env.local`

> **Note:** The Places API (New) Text Search is billed per request. For high-volume searches, monitor your quota usage in the Google Cloud Console.
