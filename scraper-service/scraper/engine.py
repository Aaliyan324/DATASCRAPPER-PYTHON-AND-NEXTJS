"""Scraping engine orchestrator.

Coordinates sources, normalization, and deduplication to produce
clean, unique business records for a given scrape request.
"""

from __future__ import annotations
import asyncio
import logging

from .query_models import ScrapeRequest, BusinessRecord
from .job_manager import Job
from .sources.overpass_osm import OverpassSource
from .deduplicator import deduplicate_records

logger = logging.getLogger(__name__)


async def run_scrape(job: Job, request: ScrapeRequest) -> None:
    """Execute a full scraping pipeline for the given job and request.

    Updates the job object in-place with progress, status, and results.
    """
    try:
        job.status = "running"
        job.stage = "Preparing scraper"
        job.progress = 5

        # -- Stage 1: Discover sources --
        job.stage = "Discovering sources"
        job.progress = 10

        source = OverpassSource()
        logger.info("Using source: %s", source.name)

        # -- Stage 2: Collect data --
        job.stage = "Collecting pages"
        job.progress = 15

        def on_progress(stage: str, percent: int):
            job.stage = stage
            job.progress = min(percent, 85)  # Cap at 85 until post-processing

        records = await source.search(request, on_progress=on_progress)

        job.pages_scraped = len(records)
        job.records_found = len(records)

        # -- Stage 3: Cleaning data --
        job.stage = "Cleaning data"
        job.progress = 85

        # Filter out records without a name
        records = [r for r in records if r.name and r.name.strip()]

        # -- Stage 4: Removing duplicates --
        job.stage = "Removing duplicates"
        job.progress = 90

        before_dedup = len(records)
        records = deduplicate_records(records)
        logger.info(
            "Deduplication: %d -> %d records", before_dedup, len(records)
        )

        # -- Stage 5: Finalizing --
        job.stage = "Finalizing results"
        job.progress = 95

        # Apply limit
        if request.limit and len(records) > request.limit:
            records = records[: request.limit]

        job.results = records
        job.records_found = len(records)
        job.status = "completed"
        job.stage = "Completed"
        job.progress = 100

        logger.info("Job %s completed: %d records", job.job_id, len(records))

    except Exception as e:
        logger.exception("Job %s failed: %s", job.job_id, e)
        job.status = "failed"
        job.stage = "Failed"
        job.error = str(e)
        job.progress = 0
