# Setup Guide

## Prerequisites

- **Node.js** 18+ (tested with Next.js 16)
- **Python** 3.11+ 
- **npm** or **yarn**

---

## Project Structure

```
datascrapper-master/
├── app/                    # Next.js frontend + API routes
├── lib/                    # Shared utilities (DB, query parser, exporter)
├── components/             # React components
├── prisma/                 # Prisma schema (PostgreSQL)
├── python-engine/          # Python Data Engine (FastAPI + Google Places + Gemini)
│   ├── server.py           # FastAPI server entry point
│   ├── main.py             # CLI entry point (standalone use)
│   ├── config.py           # Pydantic settings (reads python-engine/.env)
│   ├── ai/                 # Gemini NLP query parser
│   ├── engine/             # Search engine, normalizer, deduplicator
│   ├── sources/            # Google Places API client
│   ├── models/             # Data models (PlaceRecord)
│   ├── pakistan/           # Pakistan-specific location resolution
│   └── exporters/          # Excel/PDF export (standalone CLI use)
├── .env.example            # Next.js environment template
└── python-engine/.env.example  # Python engine environment template
```

---

## 1. Install Dependencies

### Node.js (frontend + API)

```bash
npm install
```

### Python (data engine)

```bash
cd python-engine
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

---

## 2. API Keys

The project uses **two separate `.env` files** — one for the Next.js app, one for the Python engine. API keys live only in the Python engine and are never exposed to the browser.

### Python Engine (`python-engine/.env`)

Copy the template and fill in your keys:

```bash
cd python-engine
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Google AI Studio API key for Gemini NLP. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GOOGLE_MAPS_API_KEY` | **Yes** | Google Maps Platform API key with **Places API (New)** enabled. Get one at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash`. Change if needed. |
| `REQUEST_TIMEOUT` | No | HTTP timeout in seconds for Google Places calls (default: `20`) |
| `MAX_SEARCH_VARIANTS` | No | Max search query variants the engine generates (default: `4`) |
| `DEBUG` | No | Set to `true` for verbose logging (default: `false`) |

### Next.js App (`.env` at project root)

Copy the template:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | PostgreSQL connection string (e.g. Supabase). If omitted, the app falls back to a local JSON file at `.data/db.json` |
| `PYTHON_ENGINE_URL` | **Yes** | URL of the running Python engine. Default: `http://localhost:8000` |

### Google Maps API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Enable the **Places API (New)** under APIs & Services > Library
4. Create an API key under APIs & Services > Credentials
5. (Recommended) Restrict the key to the Places API only
6. Paste the key into `python-engine/.env` as `GOOGLE_MAPS_API_KEY`

---

## 3. Database Setup (Optional)

The app works **without a database** — it falls back to a JSON file at `.data/db.json`.

To use PostgreSQL (e.g. Supabase):

1. Set `DATABASE_URL` in your root `.env`
2. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
3. Push the schema to your database:
   ```bash
   npx prisma db push
   ```

---

## 4. Start the Application

You need **two processes** running simultaneously:

### Terminal 1 — Python Data Engine (port 8000)

```bash
cd python-engine
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
uvicorn server:app --reload --port 8000
```

Or use the npm shortcut (Windows only):

```bash
npm run dev:engine
```

Verify it's running:

```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"pakistan-data-engine"}
```

### Terminal 2 — Next.js App (port 3000)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Usage

1. Open the app at `http://localhost:3000`
2. Type a natural-language search query, e.g.:
   - *"Find restaurants in Lahore"*
   - *"Hotels near Faisal Mosque Karachi"*
   - *"Beauty salons in Gujarat"*
3. The app sends your query to the Python engine, which:
   - Parses intent using **Gemini NLP** (handles English, Urdu, and Roman Urdu)
   - Searches **Google Places API (New)** with smart query variants
   - Normalizes phone numbers, addresses, and deduplicates results
4. Results appear in a searchable, filterable table
5. Export to **CSV**, **Excel**, or **PDF**

---

## 6. Using the Python Engine Standalone (CLI)

The engine can also be run directly from the terminal without the Next.js frontend:

```bash
cd python-engine
.venv\Scripts\activate
python main.py
```

This launches an interactive CLI where you can enter queries and export results directly.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to the data engine` | Make sure the Python engine is running on port 8000 |
| `GEMINI_API_KEY` validation error | Check that `python-engine/.env` exists and has your key |
| `GOOGLE_MAPS_API_KEY` validation error | Same as above — both keys must be in `python-engine/.env` |
| No phone numbers in results | Ensure **Places API (New)** is enabled (not the legacy Places API) |
| Prisma client errors | Run `npx prisma generate` |
| Port 8000 in use | Change the port in both the engine startup command and `PYTHON_ENGINE_URL` in your root `.env` |

---

## Environment Files Summary

```
datascrapper-master/
├── .env                        # Next.js — DATABASE_URL, PYTHON_ENGINE_URL
└── python-engine/
    └── .env                    # Python — GEMINI_API_KEY, GOOGLE_MAPS_API_KEY
```

**API keys are never exposed to the browser.** They are loaded server-side only by the Python engine's pydantic-settings.
