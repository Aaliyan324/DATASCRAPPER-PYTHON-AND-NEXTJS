# Pakistan Discovery Engine — Setup Guide

## Overview

A Next.js-powered geographic business discovery engine for Pakistan. Search any business category across Pakistani cities — from major metros to rural areas — and get structured results with contact details, ratings, map coordinates, and data completeness classification.

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Runtime |
| **npm** | 9+ | Package manager |
| **PostgreSQL** | 14+ (optional) | Production database — JSON fallback available for dev |
| **Google Maps API Key** | — | Places API (New) + Geocoding API |
| **Gemini API Key** (optional) | — | AI-powered query understanding |
| **Clerk Account** (optional) | — | Authentication |

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd DATASCRAPPER-PYTHON-AND-NEXTJS

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env .env.local
# Edit .env.local with your API keys (see Environment Variables below)

# 4. Set up database (optional — skip for JSON fallback)
npx prisma generate
npx prisma db push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env` to `.env.local` and configure:

```env
# ── Clerk Authentication ─────────────────────────────────────────
# Get from https://dashboard.clerk.com → Your App → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Clerk redirect URLs (leave as-is for local dev)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/

# ── Database ─────────────────────────────────────────────────────
# Leave blank to use local JSON file fallback (no DB required for dev)
# For local PostgreSQL:
DATABASE_URL=postgresql://postgres:password@localhost:5432/datascrapper
# For Supabase: get from Project Settings → Database → Connection String

# ── Google Maps Platform ─────────────────────────────────────────
# Requires: Places API (New) + Geocoding API enabled
# Get from: https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# ── Gemini AI (optional) ─────────────────────────────────────────
# Enables natural-language query understanding (Urdu, Roman Urdu, complex queries)
# Without this, a deterministic regex parser is used as fallback.
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=
```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select an existing one
3. Enable these APIs:
   - **Places API (New)** — business search and details
   - **Geocoding API** — location resolution
   - **Maps JavaScript API** — map rendering on frontend
4. Create credentials (API Key) and restrict it to these APIs
5. Set both `GOOGLE_MAPS_API_KEY` (server) and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client) to the same key

### Gemini AI Setup (Optional)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Generate an API key
3. Set `GEMINI_API_KEY` in your `.env.local`

Without Gemini, the engine falls back to a deterministic regex-based query parser.

### Database Setup (Optional)

The app works in two modes:

**Mode A — PostgreSQL (recommended for production):**
```bash
# Create the database
createdb datascrapper

# Push schema
npx prisma db push

# Regenerate Prisma client after schema changes
npx prisma generate
```

**Mode B — JSON file fallback (zero-config for dev):**
- Leave `DATABASE_URL` blank or unset
- Data is stored in `.data/db.json` automatically
- No database installation needed

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Start production server (after build) |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma db push` | Sync schema to database without migrations |
| `npx prisma studio` | Open Prisma's database GUI |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page (search input)
│   ├── search/[id]/page.tsx      # Search results page
│   ├── sign-in/                  # Clerk sign-in
│   ├── sign-up/                  # Clerk sign-up
│   └── api/
│       ├── search/route.ts       # Search job API
│       └── history/route.ts      # Search history API
├── components/
│   └── map/
│       ├── BusinessMap.tsx        # Map with marker clustering
│       ├── BusinessMarker.tsx     # Individual marker component
│       ├── MapControls.tsx        # Map type toggle, fit bounds
│       ├── MapInfoWindow.tsx      # Marker info popup
│       └── MapFallback.tsx        # Fallback when map unavailable
├── lib/
│   ├── db.ts                     # Prisma + JSON fallback database
│   ├── exporter.ts               # Excel, CSV, PDF export
│   ├── data-engine/
│   │   ├── search-orchestrator.ts # Core search workflow
│   │   ├── types.ts              # PlaceRecord, SearchPlan, SearchStatistics
│   │   ├── constants.ts          # Pakistan locations, city zones (800+)
│   │   ├── category-expander.ts  # AI + static category synonyms
│   │   ├── geographic-grid.ts    # Grid search for unknown cities
│   │   ├── google-places.ts      # Places API (New) integration
│   │   ├── query-expander.ts     # Query variant builder
│   │   ├── location-resolver.ts  # Geocoding + knowledge base
│   │   ├── normalizer.ts         # Phone/URL normalization, completeness
│   │   ├── deduplicator.ts       # Multi-field deduplication
│   │   ├── ranking.ts            # Geographic scoring + sorting
│   │   └── ai/
│   │       └── query-understanding.ts  # Gemini NLP + fallback parser
│   └── ...
├── prisma/
│   └── schema.prisma             # Database schema
└── .env                          # Environment template
```

## Architecture

### Search Pipeline

1. **Query Parsing** — Gemini AI or regex fallback extracts category, location, filters
2. **Location Resolution** — Knowledge base + Google Geocoding resolves Pakistan administrative hierarchy
3. **Category Expansion** — AI generates semantic variations (e.g., "mobile shops" → "cell phone store", "smartphone store")
4. **Zone Partitioning** — Known cities use 800+ predefined sub-area zones; unknown cities use adaptive geographic grid
5. **Concurrent Search** — 5 parallel queries per batch, 16 queries per batch, with pagination
6. **Adaptive Termination** — Stops when target reached, API budget exhausted, or diminishing returns detected (3 consecutive low-yield batches)
7. **Normalization & Deduplication** — Multi-field dedup catches same business across different place IDs
8. **Completeness Classification** — Each result tagged FULL / PARTIAL / NAME_ONLY
9. **Geographic Ranking** — Haversine distance + address similarity scoring
10. **Save & Export** — Results stored and available for Excel/CSV/PDF export

### Data Completeness

| Level | Criteria |
|---|---|
| **FULL** | Has phone + website + address + coordinates + rating |
| **PARTIAL** | Has at least 1 of the above |
| **NAME_ONLY** | Only business name (or name + category) |

### Pakistan Location Coverage

- 40+ cities with predefined search zones (800+ zones total)
- Hierarchical: Province → Division → District → Tehsil → City → Town → Neighborhood → Sector → Phase → Block
- Geographic grid fallback for cities not in the zone database
- Static synonym map for 50+ common business categories

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard under Project Settings → Environment Variables.

### Manual Deployment

```bash
npm run build
npm start
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Map not loading | Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set and Maps JavaScript API is enabled |
| "No results found" | Check that Places API (New) is enabled in Google Cloud Console |
| Search returns limited results | Ensure Gemini API key is set for better query understanding |
| Database connection errors | Verify `DATABASE_URL` or leave blank for JSON fallback |
| Prisma type errors after schema change | Run `npx prisma generate` to regenerate the client |
| Clerk auth errors | Verify both publishable and secret keys are set correctly |
