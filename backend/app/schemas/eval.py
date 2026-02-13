from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class EvalStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class TestCase(BaseModel):
    query: str
    expected_answer: Optional[str] = None
    expected_source_ids: Optional[List[str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class EvalDataset(BaseModel):
    id: str
    name: str
    workspace_id: str
    test_cases: List[TestCase]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EvalResult(BaseModel):
    test_case: TestCase
    actual_answer: str
    actual_source_ids: List[str]
    metrics: Dict[str, float] # e.g., faithfulness, answer_relevancy
    success: bool
    error: Optional[str] = None

class EvalRun(BaseModel):
    id: str
    dataset_id: str
    workspace_id: str
    status: EvalStatus
    results: List[EvalResult] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    overall_metrics: Dict[str, float] = Field(default_factory=dict)
