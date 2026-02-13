from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import structlog
from backend.app.core.telemetry import get_tracer
from backend.app.core.error_codes import AppErrorCode

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)

class BaseIngestionStrategy(ABC):
    @abstractmethod
    async def run(self, task_id: str, workspace_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the ingestion strategy."""
        pass

    @property
    @abstractmethod
    def task_type(self) -> str:
        """Return the task type string."""
        pass
