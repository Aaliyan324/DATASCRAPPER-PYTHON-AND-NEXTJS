# DataScrapper — Setup Guide

## Prerequisites

- **Node.js 18+** installed
- **Python 3.10+** installed
- PowerShell (Windows) or any terminal (Mac/Linux)

---

## Step 1: Install Node Dependencies

Open a terminal in the project root:

```powershell
cd d:\Websites\datascrapper-master
npm install
```

---

## Step 2: Generate Prisma Client

```powershell
npx prisma generate
```

> This must be run after `npm install` and any time the Prisma schema changes.

---

## Step 3: Install Python Dependencies

Open a terminal in the scraper-service directory:

```powershell
cd d:\Websites\datascrapper-master\scraper-service
pip install -r requirements.txt
```

---

## Step 4: Start the Python Scraper Service (Port 8000)

In the same scraper-service terminal:

```powershell
python -m uvicorn main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Application startup complete.
```

Leave this terminal running.

---

## Step 5: Start the Next.js Dev Server (Port 3000)

Open a **second terminal** in the project root:

```powershell
cd d:\Websites\datascrapper-master
npm run dev
```

You should see:

```
▲ Next.js 16.3.1 (Turbopack)
- Local:         http://localhost:3000
✓ Ready
```

Leave this terminal running.

---

## Step 6: Open the App

Open your browser and go to **http://localhost:3000**

---

## Step 7: Test a Query

Type a natural-language query in the search box, for example:

- `restaurants in Lahore`
- `software houses in Islamabad`
- `hotels in Karachi with phone numbers`
- `dentists in Rawalpindi`

Click **EXTRACT DATA** and wait for the results to load.

---

## Environment Configuration (Optional)

No `.env` file is required to get started. Defaults:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *(not set)* | PostgreSQL connection string. If omitted, uses local JSON file at `.data/db.json` |
| `PYTHON_SCRAPER_URL` | `http://localhost:8000` | URL of the Python scraper service |

To configure a database, create a `.env` file in the project root:

```
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
PYTHON_SCRAPER_URL=http://localhost:8000
```

---

## Project Structure

```
datascrapper-master/
├── app/                    # Next.js frontend + API routes
├── components/             # React UI components
├── lib/                    # TypeScript utilities (query parser, DB, exporter)
├── prisma/                 # Database schema
├── scraper-service/        # Python FastAPI scraping engine
│   ├── main.py             # FastAPI entry point
│   └── scraper/            # Scraping modules (engine, sources, normalizer)
├── scraper.py              # Original standalone Python scraper (reference)
└── SETUP.md                # This file
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module '.prisma/client/default'` | Run `npx prisma generate` |
| API returns 500 on search | Make sure Python scraper is running on port 8000 |
| `ModuleNotFoundError: No module named 'fastapi'` | Run `pip install -r requirements.txt` in `scraper-service/` |
| Turbopack cache error | Delete `.next` folder and restart `npm run dev` |
| Hydration mismatch warning | Browser extension injecting attributes — harmless, suppressed on `<body>` |
