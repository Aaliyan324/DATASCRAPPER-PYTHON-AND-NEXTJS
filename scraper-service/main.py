"""FastAPI application for the Python scraping service.

Endpoints:
    POST /scrape              - Create a new scraping job
    GET  /jobs/{job_id}       - Get job status and progress
    GET  /jobs/{job_id}/results - Get scraped results
    GET  /health              - Health check
"""

from __future__ import annotations
import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from scraper.query_models import ScrapeRequest, ScrapeResponse, JobResultsResponse
from scraper.job_manager import job_manager
from scraper.engine import run_scrape

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DataScrapper - Python Scraping Service",
    version="2.0.0",
    description="Real web scraping engine powered by OpenStreetMap and public data sources.",
)

# Allow Next.js dev server to communicate with this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "scraper-service"}


@app.post("/scrape", response_model=ScrapeResponse)
async def create_scrape_job(request: ScrapeRequest):
    """Create a new scraping job.

    Returns a job_id immediately. The scraping runs asynchronously.
    Poll GET /jobs/{job_id} for status updates.
    """
    job = job_manager.create_job()
    logger.info(
        "Created job %s: category=%s, location=%s",
        job.job_id,
        request.category,
        request.location.query or request.location.city,
    )

    # Launch scraping as background asyncio task
    task = asyncio.create_task(run_scrape(job, request))
    job_manager.set_task(job.job_id, task)

    return ScrapeResponse(job_id=job.job_id, status="queued")


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get the current status and progress of a scraping job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job.to_progress()


@app.get("/jobs/{job_id}/results", response_model=JobResultsResponse)
async def get_job_results(job_id: str):
    """Get the scraped business records for a completed job."""
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
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("SCRAPER_HOST", "0.0.0.0")
    port = int(os.getenv("SCRAPER_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
