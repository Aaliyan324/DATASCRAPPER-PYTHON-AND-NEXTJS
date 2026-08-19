"""Abstract base class for scraping sources."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Callable, Optional

from ..query_models import BusinessRecord, ScrapeRequest


class BaseSource(ABC):
    """Interface that all scraping sources must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name for this source."""
        ...

    @abstractmethod
    async def search(
        self,
        request: ScrapeRequest,
        on_progress: Optional[Callable[[str, int], None]] = None,
    ) -> list[BusinessRecord]:
        """Search for businesses matching the request.

        Args:
            request: Structured scrape request with category, location, filters.
            on_progress: Optional callback(stage_description, percent_complete).

        Returns:
            List of extracted business records.
        """
        ...
