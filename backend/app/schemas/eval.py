from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EvalStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TestCase(BaseModel):
    query: str
    expected_answer: str | None = None
    expected_source_ids: list[str] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvalDataset(BaseModel):
    id: str
    name: str
    workspace_id: str
    test_cases: list[TestCase]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EvalResult(BaseModel):
    test_case: TestCase
    actual_answer: str
    actual_source_ids: list[str]
    metrics: dict[str, float]  # e.g., faithfulness, answer_relevancy
    success: bool
    error: str | None = None


class EvalRun(BaseModel):
    id: str
    dataset_id: str
    workspace_id: str
    status: EvalStatus
    results: list[EvalResult] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    overall_metrics: dict[str, float] = Field(default_factory=dict)
