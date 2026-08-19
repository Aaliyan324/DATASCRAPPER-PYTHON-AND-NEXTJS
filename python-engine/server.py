"""FastAPI server wrapping the Pakistan Data Engine for Next.js integration.

Endpoints:
    POST /scrape                - Create a new search job (natural-language query)
    GET  /jobs/{job_id}         - Poll job status and progress
    GET  /jobs/{job_id}/results - Retrieve completed search records
    GET  /health                - Health check
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic models for the API contract
# ---------------------------------------------------------------------------


class ScrapeRequest(BaseModel):
    query: str
    limit: int = 50


class ScrapeResponse(BaseModel):
    job_id: str
    status: str = "queued"


class JobProgress(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    stage: str = ""
    records_found: int = 0
    error: Optional[str] = None


class BusinessRecordOut(BaseModel):
    name: str
    category: str = ""
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    phone_national: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_range: Optional[str] = None
    opening_hours: Optional[str] = None
    description: Optional[str] = None
    google_maps_url: Optional[str] = None
    business_status: Optional[str] = None
    source: str = "Google Places API (New)"
    source_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    location_match_score: Optional[float] = None


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    records: list[BusinessRecordOut]
    debug_info: Optional[dict] = None


# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------


class Job:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status: str = "queued"
        self.progress: int = 0
        self.stage: str = ""
        self.records_found: int = 0
        self.error: Optional[str] = None
        self.results: list[BusinessRecordOut] = []
        self.debug_info: Optional[dict] = None

    def to_progress(self) -> JobProgress:
        return JobProgress(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            stage=self.stage,
            records_found=self.records_found,
            error=self.error,
        )


class JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create_job(self) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(job_id)
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)


job_manager = JobManager()


# ---------------------------------------------------------------------------
# Pipeline runner (executes the Pakistan Data Engine)
# ---------------------------------------------------------------------------


def _run_engine(query: str, limit: int, job: Job) -> None:
    """Synchronous pipeline runner (called inside asyncio.to_thread)."""
    try:
        job.status = "running"
        job.stage = "Understanding request"
        job.progress = 10

        from ai.query_parser import QueryParser
        from engine.search_engine import SearchEngine

        parser = QueryParser()

        job.stage = "Parsing natural language"
        job.progress = 20

        plan = parser.parse(query)

        # Override requested_result_count from the API limit parameter.
        if limit:
            plan.requested_result_count = limit

        plan.original_query = query

        if not plan.location.confident:
            # If location is ambiguous, fall back to the raw query and hope
            # Google Places resolves it.  The CLI would prompt the user,
            # but we cannot do that over HTTP.
            pass

        job.stage = "Searching Google Places"
        job.progress = 40

        engine = SearchEngine()
        records, stats = engine.search(plan)

        job.stage = "Cleaning and normalizing"
        job.progress = 80

        # Convert PlaceRecord -> BusinessRecordOut
        out_records: list[BusinessRecordOut] = []
        for r in records:
            out_records.append(
                BusinessRecordOut(
                    name=r.business_name or "Unknown",
                    category=r.category or plan.category or "Business",
                    address=r.address,
                    area=r.area,
                    city=r.city,
                    country=r.country,
                    phone=r.phone,
                    phone_national=r.phone_national,
                    email=None,
                    website=r.website,
                    rating=r.rating,
                    review_count=r.review_count,
                    opening_hours=None,
                    description=None,
                    google_maps_url=r.google_maps_url,
                    business_status=r.business_status,
                    source=r.source,
                    source_url=r.google_maps_url,
                    latitude=r.latitude,
                    longitude=r.longitude,
                    distance_km=r.distance_km,
                    location_match_score=r.location_match_score,
                )
            )

        job.results = out_records
        job.records_found = len(out_records)
        job.debug_info = plan.debug_info
        job.status = "completed"

        job.stage = "Completed"
        job.progress = 100

        logger.info(
            "Job %s completed: %d records (raw=%d, deduped=%d)",
            job.job_id,
            len(out_records),
            stats.get("raw_results", 0),
            stats.get("duplicates_removed", 0),
        )

    except Exception as exc:
        logger.exception("Job %s failed: %s", job.job_id, exc)
        job.status = "failed"
        job.stage = "Failed"
        job.error = str(exc)
        job.progress = 0


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Pakistan Data Engine - API",
    version="2.0.0",
    description="Google Places + Gemini NLP engine for Pakistan business data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pakistan-data-engine"}


@app.post("/scrape", response_model=ScrapeResponse)
async def create_scrape_job(request: ScrapeRequest):
    job = job_manager.create_job()
    logger.info("Created job %s: query=%r", job.job_id, request.query)

    # Run the synchronous engine pipeline in a thread so we don't block the
    # event loop.
    task = asyncio.create_task(asyncio.to_thread(_run_engine, request.query, request.limit, job))
    return ScrapeResponse(job_id=job.job_id, status="queued")


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_progress()


@app.get("/jobs/{job_id}/results", response_model=JobResultsResponse)
async def get_job_results(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ("completed", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Job is still {job.status}. Wait for completion.",
        )

    return JobResultsResponse(
        job_id=job.job_id,
        status=job.status,
        records=job.results,
        debug_info=job.debug_info,
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("ENGINE_HOST", "0.0.0.0")
    port = int(os.getenv("ENGINE_PORT", "8000"))
    uvicorn.run("server:app", host=host, port=port, reload=True)
