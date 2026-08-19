"""In-memory job manager for tracking scraping job status."""

from __future__ import annotations
import asyncio
import uuid
from typing import Optional

from .query_models import JobProgress, BusinessRecord


class Job:
    """Represents a single scraping job."""

    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status: str = "queued"
        self.progress: int = 0
        self.stage: str = ""
        self.records_found: int = 0
        self.pages_scraped: int = 0
        self.pages_failed: int = 0
        self.error: Optional[str] = None
        self.results: list[BusinessRecord] = []
        self._task: Optional[asyncio.Task] = None

    def to_progress(self) -> JobProgress:
        return JobProgress(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            stage=self.stage,
            records_found=self.records_found,
            pages_scraped=self.pages_scraped,
            pages_failed=self.pages_failed,
            error=self.error,
        )


class JobManager:
    """Simple in-memory job store. Jobs are ephemeral."""

    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create_job(self) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(job_id)
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def set_task(self, job_id: str, task: asyncio.Task):
        job = self._jobs.get(job_id)
        if job:
            job._task = task


# Singleton instance
job_manager = JobManager()
