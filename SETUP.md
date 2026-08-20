# 🚀 Aether AI — Setup & Architecture Guide

> Pakistan Business Data Discovery Engine powered by Google Places API, Gemini AI, and Clerk Authentication.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
   - [Clerk Authentication](#clerk-authentication-setup)
   - [Google Maps Platform](#google-maps-platform-setup)
   - [Gemini AI](#gemini-ai-setup)
   - [Database (PostgreSQL)](#database-postgresql-setup)
4. [Database Migration](#database-migration)
5. [How It Works](#how-it-works)
6. [Architecture Diagram](#architecture-diagram)
7. [Example Queries](#example-queries)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 18.x | Runtime |
| **npm** | ≥ 9.x | Package manager |
| **PostgreSQL** | ≥ 14 (optional) | Persistent database |
| **Clerk account** | Free | Authentication |
| **Google Cloud account** | Free tier | Places + Geocoding API |
| **Google AI Studio** | Free | Gemini AI (optional) |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Aaliyan324/DATASCRAPPER-PYTHON-AND-NEXTJS
cd DATASCRAPPER-PYTHON-AND-NEXTJS

# 2. Install Node dependencies (no Python required)
npm install

# 3. Copy the environment template
cp .env.example .env.local

# 4. Fill in your keys in .env.local (see sections below)
#    REQUIRED: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, GOOGLE_MAPS_API_KEY
#    OPTIONAL: GEMINI_API_KEY, DATABASE_URL

# 5. Generate Prisma client (and migrate if using PostgreSQL)
npx prisma generate
# If using PostgreSQL:
npx prisma migrate dev --name init

# 6. Start the development server
npm run dev

# 7. Open http://localhost:3000
```

---

## Environment Variables

Create `.env.local` in the project root (never commit this file):

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Google APIs
GOOGLE_MAPS_API_KEY=AIzaSy_...

# Gemini AI (optional)
GEMINI_API_KEY=AIzaSy_...

# PostgreSQL (optional — falls back to local JSON file)
DATABASE_URL=postgresql://postgres:password@localhost:5432/datascrapper
```

---

### Clerk Authentication Setup

1. Go to [https://clerk.com](https://clerk.com) and create a **free account**
2. Click **"Add application"** → give it a name (e.g. `Aether AI`) → choose **Email + Google** sign-in methods
3. Go to **API Keys** in the left sidebar
4. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → starts with `pk_test_`
   - `CLERK_SECRET_KEY` → starts with `sk_test_`
5. Paste into `.env.local`

> **Note**: No billing required. Clerk's free tier supports 10,000 Monthly Active Users.

---

### Google Maps Platform Setup

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Library** and enable:
   - ✅ **Places API (New)** — for business data search
   - ✅ **Geocoding API** — for location resolution
4. Go to **APIs & Services → Credentials → Create Credentials → API key**
5. (Recommended) Restrict the key to: `Places API (New)` and `Geocoding API`
6. Copy the key into `.env.local` as `GOOGLE_MAPS_API_KEY`

> **Cost**: Google offers $200/month free credit. Each Places Text Search call costs ~$0.032. At 3 pages × 20 results = 60 results per query, 100-result searches typically use 5–10 API calls (~$0.16–$0.32 per search).

---

### Gemini AI Setup

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy into `.env.local` as `GEMINI_API_KEY`

> **Without Gemini**: The app uses a deterministic regex-based parser as fallback. Basic English queries (e.g., "restaurants in Lahore") work perfectly. Complex Urdu/Roman Urdu queries need Gemini.

---

### Database (PostgreSQL) Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (if not already installed)
# Windows: https://www.postgresql.org/download/windows/

# Create the database
psql -U postgres -c "CREATE DATABASE datascrapper;"

# Set in .env.local:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/datascrapper
```

#### Option B: Supabase (Free Cloud PostgreSQL)

1. Go to [https://supabase.com](https://supabase.com) → New project
2. Go to **Project Settings → Database → Connection String → URI**
3. Copy the URI and set it as `DATABASE_URL` in `.env.local`

#### Option C: No Database (JSON Fallback)

Leave `DATABASE_URL` unset. The app will use a local `.data/db.json` file automatically. Data is stored on the server filesystem — suitable for development only.

---

## Database Migration

After setting `DATABASE_URL`:

```bash
# Create the tables (first time setup)
npx prisma migrate dev --name init

# After future schema changes
npx prisma migrate dev --name describe_the_change

# View the database in a browser GUI
npx prisma studio
```

---

## How It Works

### Authentication Flow

```
User visits / → Clerk checks session cookie
  ├─ Signed in   → Show search form + personal history sidebar
  └─ Not signed in → Show landing CTA (Sign In / Get Started)

POST /api/search → Clerk auth() extracts userId
  ├─ No userId → 401 Unauthorized
  └─ Has userId → Create SearchJob with userId → background search
```

### Search Flow

```
User types: "200 restaurants in DHA Lahore with phone numbers"
      │
      ▼
[Gemini API] (or regex fallback)
  Extracts: category="restaurant", location=DHA Lahore, count=200
      │
      ▼
[Location Resolver] → Google Geocoding API
  Resolves: lat/lng of DHA Lahore
      │
      ▼
[Search Orchestrator]
  Generates: ~80 queries across 20 DHA sub-zones × 4 phrasings
  Example queries:
    "restaurant in DHA Phase 1 Lahore, Pakistan"
    "restaurants near DHA Phase 1 Lahore"
    "best restaurant DHA Phase 1 Lahore"
    ...
      │
      ▼
[Google Places API (New)] — Text Search
  5 concurrent queries · 3 pages each · 60 results per query
  Total raw results: up to 4,800 unique place IDs
      │
      ▼
[Deduplicator] — Multi-field dedup (place_id, phone, name+address)
[Ranker] — Haversine distance scoring + data quality scoring
[Slicer] — Top 200 results returned
      │
      ▼
[PostgreSQL via Prisma] (or JSON fallback)
  Saved: Business records linked to SearchJob.userId
      │
      ▼
[Client polls /api/search/:id] → streams progress to UI
[User exports] → Excel / CSV / PDF
```

### Per-User Data Isolation

Every `SearchJob` record stores the Clerk `userId`. API routes validate:
- `GET /api/history` → only returns jobs where `userId = currentUser`
- `GET /api/search/:id` → returns 403 if job belongs to different user
- `GET /api/search/:id/results` → same ownership check

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                      │
│                                                             │
│  app/                                                       │
│  ├─ layout.tsx          ← ClerkProvider (dark theme)        │
│  ├─ page.tsx            ← Landing + UserButton              │
│  ├─ sign-in/            ← Clerk <SignIn /> component        │
│  ├─ sign-up/            ← Clerk <SignUp /> component        │
│  ├─ search/[id]/        ← Results page                      │
│  └─ api/                                                    │
│     ├─ search/          ← POST (auth required, userId saved)│
│     ├─ search/[id]/     ← GET (ownership check)             │
│     ├─ search/[id]/results/ ← GET (ownership check)         │
│     └─ history/         ← GET (user-scoped)                 │
│                                                             │
│  middleware.ts           ← clerkMiddleware (protects /api)  │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  lib/data-engine/   │
        │                     │
        │  index.ts           │  ← Engine entrypoint
        │  search-orchestrator│  ← Zone partitioning + loop
        │  google-places.ts   │  ← Places API (New) client
        │  ai/query-understanding  ← Gemini + fallback
        │  location-resolver  │  ← Geocoding API
        │  query-expander     │  ← Query variant generation
        │  deduplicator       │  ← Multi-field dedup
        │  ranking.ts         │  ← Haversine + quality score
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │      lib/db.ts      │
        │                     │
        │  Prisma ORM ──────── PostgreSQL (production)
        │  JSON fallback ───── .data/db.json (development)
        └─────────────────────┘
```

---

## Example Queries

Try these after signing in:

| Query | What it does |
|-------|-------------|
| `restaurants in Lahore` | Top 100 restaurants across Lahore zones |
| `200 hotels in Karachi with phone numbers` | 200 hotels, phone-prioritised ranking |
| `software houses in Islamabad F-7 with websites` | F-7/F-8 tech companies |
| `dentists in DHA Karachi` | Dental clinics in DHA zones |
| `bakeries in Gulberg Lahore` | Hyperlocal bakery search |
| `hospitals in Rawalpindi with ratings above 4` | High-rated hospitals |
| `private schools in Faisalabad` | School directory |
| `pharmacies near Blue Area Islamabad` | Proximity-ranked pharmacies |

---

## Troubleshooting

### "You must be signed in" on the homepage
→ Clerk is working correctly. Click **Get Started** to create an account.

### No results returned
1. Check `GOOGLE_MAPS_API_KEY` is set and **Places API (New)** is enabled in GCP
2. Check the browser console / server terminal for API errors
3. Make sure the query has both a **category** and a **location** (e.g., `cafes in Lahore`)

### "Prisma Client not found" error
```bash
npx prisma generate
```

### Database connection refused
→ Either start your local PostgreSQL service, or remove `DATABASE_URL` from `.env.local` to use the JSON fallback.

### Clerk redirect loop
→ Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are both set and match the same Clerk application.

### Port already in use
```bash
# Kill whatever is on port 3000
npx kill-port 3000
npm run dev
```
