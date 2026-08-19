# DataScrapper - Python-Powered Business Data Discovery

A production-quality, full-stack web application that extracts structured business data from public web sources using natural-language search commands. Users type queries like *"restaurants in Lahore with phone numbers"* and receive real, scraped data in an interactive dashboard with filtering, sorting, and Excel/PDF/CSV exports.

**No AI API key required.** The application uses deterministic natural-language parsing and a Python-based web scraping engine powered by OpenStreetMap.

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
                    │ Frontend + API      │
                    │ (Deterministic      │
                    │  Query Parser)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Python FastAPI    │
                    │  Scraping Service   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              OpenStreetMap         Public Directories
              / Overpass API        (extensible)
                    │                     │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │ Extraction +        │
                    │ Normalization +     │
                    │ Deduplication       │
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

**Gemini is NOT required.** The application uses a deterministic NL parser (TypeScript) and a Python scraping engine. No paid AI API is involved.

---

## Key Features

1. **Deterministic NL Parser**: Rule-based query parsing with extensive synonym support for English, Urdu, and Roman Urdu. Converts natural language into structured search parameters (category, location, filters, fields).
2. **Python Scraping Engine**: FastAPI-based service that queries OpenStreetMap/Overpass API for real business data. Modular source architecture allows adding new data sources.
3. **Real Data Only**: Every result originates from publicly accessible web sources. No fake data, no demo seeds, no hardcoded businesses.
4. **Normalization & Deduplication**: Phone number normalization, domain comparison, fuzzy business name matching to prevent duplicate records.
5. **Interactive Dashboard**:
   - Real-time progress tracker with pipeline stages
   - Metrics cards (records, cities, categories, data coverage)
   - Full data table with sticky headers, sorting, and pagination
   - Advanced filters (city, category, rating, phone/website availability)
   - Detail drawer with full business information
6. **Export**: Client-side Excel (SheetJS), PDF (jsPDF), and CSV downloads.
7. **Job-Based Architecture**: Async scraping with status tracking (queued, running, completed, failed).

---

## Technology Stack

**Frontend & API (Next.js)**:
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Lucide React icons, Framer Motion
- Zod for validation
- SheetJS (`xlsx`), jsPDF, jspdf-autotable for exports

**Scraping Service (Python)**:
- Python 3.11+
- FastAPI, Uvicorn
- httpx (async HTTP)
- BeautifulSoup4, lxml (HTML parsing)
- Pydantic (data models)

**Database**:
- PostgreSQL (Supabase) via Prisma ORM 7
- Automatic JSON file fallback when DATABASE_URL is not configured

---

## Project Structure

```text
datascrapper/
├── app/                          # Next.js frontend & API
│   ├── api/
│   │   ├── history/route.ts      # Search history
│   │   └── search/
│   │       ├── route.ts          # Create job, proxy to Python
│   │       └── [id]/
│   │           ├── route.ts      # Poll job status
│   │           └── results/route.ts  # Get results
│   ├── page.tsx                  # Landing page
│   ├── search/[id]/page.tsx      # Results dashboard
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── gradient-border.tsx       # UI component
├── lib/
│   ├── query-parser.ts           # Deterministic NL parser (no AI)
│   ├── db.ts                     # Prisma + JSON fallback DB layer
│   ├── exporter.ts               # Excel, PDF, CSV exporters
│   └── normalization.ts          # Dedup & cleaning utilities
├── prisma/
│   └── schema.prisma             # PostgreSQL models
├── scraper-service/              # Python scraping service
│   ├── main.py                   # FastAPI app
│   ├── requirements.txt
│   ├── scraper/
│   │   ├── query_models.py       # Pydantic models
│   │   ├── job_manager.py        # In-memory job tracking
│   │   ├── engine.py             # Scraping orchestrator
│   │   ├── normalizer.py         # Data normalization
│   │   ├── deduplicator.py       # Record deduplication
│   │   ├── extractors.py         # Field extraction (HTML, JSON-LD)
│   │   └── sources/
│   │       ├── base.py           # Abstract source interface
│   │       └── overpass_osm.py   # OpenStreetMap/Overpass source
│   └── .env.example
└── scraper.py                    # Standalone CLI scraper (legacy)
```

---

## Getting Started

### 1. Next.js Application

Install dependencies:

```bash
npm install
```

Create a `.env` file (or copy from `.env.example`):

```env
# PostgreSQL (optional - falls back to JSON file)
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Python scraper URL (required)
PYTHON_SCRAPER_URL=http://localhost:8000
```

If using PostgreSQL, push the schema:

```bash
npx prisma db push
```

Start the dev server:

```bash
npm run dev
```

### 2. Python Scraping Service

Navigate to the scraper service:

```bash
cd scraper-service
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate (Windows):

```bash
.venv\Scripts\activate
```

Activate (Linux/macOS):

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the scraper service:

```bash
uvicorn main:app --reload --port 8000
```

Or use the convenience script from the project root:

```bash
npm run dev:scraper
```

### 3. Open the Application

Visit [http://localhost:3000](http://localhost:3000)

Make sure both services are running:
- Next.js on port 3000
- Python scraper on port 8000

---

## Example Queries

- "restaurants in Lahore with phone numbers"
- "hotels in Islamabad with ratings above 4"
- "software houses in Islamabad with websites"
- "dentists in Rawalpindi with phone numbers and addresses"
- "schools in Lahore with website and contact number"
- "لاہور میں ہوٹل جن کے فون نمبر ہوں"
- "راولپنڈی میں کیفے"

---

## API Reference

### Next.js API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Create a search job (accepts `{ command }`) |
| GET | `/api/search/{id}` | Poll job status and progress |
| GET | `/api/search/{id}/results` | Get scraped business records |
| GET | `/api/history` | List recent search jobs |

### Python Scraper API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scrape` | Create scraping job (accepts structured query) |
| GET | `/jobs/{job_id}` | Get job status/progress |
| GET | `/jobs/{job_id}/results` | Get scraped records |
| GET | `/health` | Health check |

---

## Legal & Compliance

- Only gathers publicly available data from OpenStreetMap
- Respects Nominatim rate limits (1 request per second)
- Does not bypass CAPTCHAs, authentication, or paywalls
- Preserves source URLs for data verification
- Rate-limited HTTP requests with appropriate delays
