"""
Base evaluation runner for RAG benchmarks.

Provides abstract base class and common functionality for all evaluation runners.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, Iterator, List, Optional, Union
from enum import Enum

import structlog

from backend.app.eval.datasets.base import DatasetEntry

logger = structlog.get_logger(__name__)


class RunnerStatus(Enum):
    """Status of an evaluation run."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class RunnerConfig:
    """Configuration for an evaluation run."""
    # Dataset settings
    max_samples: Optional[int] = None
    shuffle: bool = False
    seed: Optional[int] = None
    
    # Execution settings
    batch_size: int = 1
    max_concurrent: int = 1
    timeout_per_sample: Optional[float] = None
    retry_attempts: int = 3
    
    # Metric settings
    compute_retrieval_metrics: bool = True
    compute_generation_metrics: bool = True
    k_values: List[int] = field(default_factory=lambda: [1, 5, 10])
    
    # Output settings
    save_intermediate: bool = True
    max_intermediate_samples: int = 1000  # Limit to prevent memory issues
    output_format: str = "json"
    
    def __post_init__(self):
        if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:
            self.k_values = [1, 5, 10]if self.k_values is None:



@dataclass
class SampleResult:
    """Result for a single evaluation sample."""
    sample_id: str
    query: str
    ground_truth_answer: Optional[str]
    predicted_answer: Optional[str]
    retrieved_documents: List[str] = field(default_factory=list)
    retrieval_metrics: Dict[str, float] = field(default_factory=dict)
    generation_metrics: Dict[str, float] = field(default_factory=dict)
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.retrieved_documents is None:
            self.retrieved_documents = []
        if self.retrieval_metrics is None:
            self.retrieval_metrics = {}
        if self.generation_metrics is None:
            self.generation_metrics = {}
        if self.metadata is None:
            self.metadata = {}


@dataclass
class RunnerResult:
    """Result of an evaluation run."""
    runner_name: str
    dataset_name: str
    status: RunnerStatus
    config: RunnerConfig
    
    # Timing
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Results
    sample_results: List[SampleResult] = field(default_factory=list)
    aggregated_metrics: Dict[str, Dict[str, float]] = field(default_factory=dict)
    
    # Metadata
    total_samples: int = 0
    successful_samples: int = 0
    failed_samples: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.sample_results is None:
            self.sample_results = []
        if self.aggregated_metrics is None:
            self.aggregated_metrics = {}
        if self.metadata is None:
            self.metadata = {}
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_samples == 0:
            return 0.0
        return self.successful_samples / self.total_samples
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate total duration."""
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "runner_name": self.runner_name,
            "dataset_name": self.dataset_name,
            "status": self.status.value,
            "config": {
                "max_samples": self.config.max_samples,
                "batch_size": self.config.batch_size,
                "k_values": self.config.k_values,
            },
            "timing": {
                "started_at": self.started_at.isoformat(),
                "completed_at": self.completed_at.isoformat() if self.completed_at else None,
                "duration_seconds": self.duration_seconds,
            },
            "summary": {
                "total_samples": self.total_samples,
                "successful_samples": self.successful_samples,
                "failed_samples": self.failed_samples,
                "success_rate": self.success_rate,
            },
            "aggregated_metrics": self.aggregated_metrics,
            "sample_results": [
                {
                    "sample_id": sr.sample_id,
                    "query": sr.query,
                    "retrieval_metrics": sr.retrieval_metrics,
                    "generation_metrics": sr.generation_metrics,
                    "latency_ms": sr.latency_ms,
                    "error": sr.error,
                }
                for sr in self.sample_results
            ],
        }


class BaseRunner(ABC):
    """
    Abstract base class for evaluation runners.
    
    All evaluation runners must inherit from this class and implement
the required abstract methods.
    
    Example:
        class MyRunner(BaseRunner):
            async def run(
                self,
                dataset: Iterator[DatasetEntry],
                rag_pipeline: Callable,
                config: RunnerConfig,
            ) -> RunnerResult:
                # Implementation
                pass
    """
    
    def __init__(self, name: str):
        """
        Initialize the runner.
        
        Args:
            name: Unique name for this runner
        """
        self.name = name
        self.logger = logger.bind(runner=name)
    
    @abstractmethod
    async def run(
        self,
        dataset: Iterator[DatasetEntry],
        rag_pipeline: Callable,
        config: RunnerConfig,
    ) -> RunnerResult:
        """
        Run evaluation on a dataset.
        
        Args:
            dataset: Iterator over dataset entries
            rag_pipeline: Function that runs the RAG pipeline
                Expected signature: (query: str) -> Dict with keys:
                - "answer": generated answer
                - "documents": list of retrieved document IDs
                - "contexts": list of retrieved contexts (optional)
            config: Runner configuration
            
        Returns:
            RunnerResult with evaluation results
        """
        pass
    
    async def validate_setup(
        self,
        rag_pipeline: Callable,
    ) -> bool:
        """
        Validate that the RAG pipeline is properly configured.
        
        Args:
            rag_pipeline: RAG pipeline function
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Try a simple test query
            test_result = await rag_pipeline("What is RAG?")
            required_keys = ["answer"]
            return all(key in test_result for key in required_keys)
        except Exception as e:
            self.logger.error("validation_failed", error=str(e))
            return False
    
    def _create_result(
        self,
        dataset_name: str,
        config: RunnerConfig,
        status: RunnerStatus = RunnerStatus.PENDING,
    ) -> RunnerResult:
        """Create a new RunnerResult."""
        return RunnerResult(
            runner_name=self.name,
            dataset_name=dataset_name,
            status=status,
            config=config,
        )
    
    def _aggregate_metrics(
        self,
        sample_results: List[SampleResult],
    ) -> Dict[str, Dict[str, float]]:
        """
        Aggregate metrics across all samples.
        
        Args:
            sample_results: List of sample results
            
        Returns:
            Dictionary with aggregated statistics
        """
        from backend.app.eval.metrics.retrieval import RetrievalMetrics
        from backend.app.eval.metrics.generation import GenerationMetrics
        
        aggregated = {}
        
        # Aggregate retrieval metrics
        retrieval_results = [sr.retrieval_metrics for sr in sample_results if sr.retrieval_metrics]
        if retrieval_results:
            aggregated["retrieval"] = self._compute_stats(retrieval_results)
        
        # Aggregate generation metrics
        generation_results = [sr.generation_metrics for sr in sample_results if sr.generation_metrics]
        if generation_results:
            aggregated["generation"] = self._compute_stats(generation_results)
        
        # Aggregate latency
        latencies = [sr.latency_ms for sr in sample_results if sr.latency_ms is not None]
        if latencies:
            aggregated["latency_ms"] = {
                "mean": sum(latencies) / len(latencies),
                "min": min(latencies),
                "max": max(latencies),
                "count": len(latencies),
            }
        
        return aggregated
    
    def _compute_stats(
        self,
        metrics_list: List[Dict[str, float]],
    ) -> Dict[str, Dict[str, float]]:
        """Compute statistics for a list of metric dictionaries."""
        if not metrics_list:
            return {}
        
        # Collect all metric names
        all_metrics = set()
        for m in metrics_list:
            all_metrics.update(m.keys())
        
        stats = {}
        for metric_name in all_metrics:
            values = [m[metric_name] for m in metrics_list if metric_name in m]
            if values:
                stats[metric_name] = {
                    "mean": sum(values) / len(values),
                    "std": self._std(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values),
                }
        
        return stats
    
    def _std(self, values: List[float]) -> float:
        """Calculate standard deviation."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5