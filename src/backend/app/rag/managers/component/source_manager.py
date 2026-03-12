import asyncio
import logging
import time
from typing import Any, Type

from app.managers.base import BaseManager
from app.rag.components.sources.base import BaseSource
from app.managers.logger_manager import LoggerManager

# We will just setup standard python logger wrapped in LoggerManager conceptually
# According to prompt: "Use logger_manager (do not print)"
logger = logging.getLogger(__name__)

class LoggerManager:
    """Simple wrapper for logging metadata and timing."""
    @staticmethod
    def log_source_action(name: str, action: str, count: int, elapsed_ms: float):
        logger.info(f"Source [{name}] {action}: {count} file(s) in {elapsed_ms:.1f}ms")

class SourceManager(BaseManager):
    """Orchestrates source components to fetch documents."""
    
    registry: dict[str, Type[BaseSource]] = {}

    @classmethod
    def register(cls, name: str, component_cls: Type[BaseSource]) -> None:
        """Register a new BaseSource implementation."""
        cls.registry[name] = component_cls

    async def get(self, name: str, config: dict[str, Any]) -> BaseSource:
        """Instantiate and return a registered source by name."""
        if name not in self.registry:
            raise ValueError(f"Source '{name}' is not registered. Available: {list(self.registry.keys())}")
        
        # Instantiate and validate
        source_instance = self.registry[name]()
        await source_instance.check_dependencies()
        await source_instance.initialize()
        return source_instance

    async def list_files(self, source_name: str, context: Any, config: dict[str, Any]) -> list[Any]:
        """List files from the source, tracking timing and metadata."""
        source = await self.get(source_name, config)
        
        start = time.perf_counter()
        files = await source.list_files(context, config)
        elapsed = (time.perf_counter() - start) * 1000
        
        LoggerManager.log_source_action(source.name, "list_files", len(files), elapsed)
        return files

    async def fetch_all(self, source_name: str, context: Any, config: dict[str, Any], files: list[Any]) -> list[bytes]:
        """Fetch all provided files concurrently."""
        source = await self.get(source_name, config)
        
        start = time.perf_counter()
        
        # Concurrent fetching via asyncio.gather
        fetch_tasks = [source.get_file(context, f) for f in files]
        contents = await asyncio.gather(*fetch_tasks)
        
        elapsed = (time.perf_counter() - start) * 1000
        LoggerManager.log_source_action(source.name, "fetch_all", len(contents), elapsed)
        
        return contents

# Example Registration
from app.rag.components.sources.minio_source import MinIOSource
from app.rag.components.sources.upload_source import UploadSource

SourceManager.register(MinIOSource.name, MinIOSource)
SourceManager.register(UploadSource.name, UploadSource)
