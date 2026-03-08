from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EvaluationDatasetCreate(BaseModel):
    workspace_id: str
    name: str
    description: str | None = None


class EvaluationDatasetSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    organization_id: str
    project_id: str
    workspace_id: str
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EvaluationQuestionCreate(BaseModel):
    question: str
    expected_answer: str
    expected_context: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvaluationQuestionSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    evaluation_dataset_id: str
    organization_id: str
    project_id: str
    workspace_id: str
    question: str
    expected_answer: str
    expected_context: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EvaluationRunRequest(BaseModel):
    knowledge_dataset_id: str
    top_k: int = 3
    llm_provider: str | None = None
    llm_model: str | None = None


class EvaluationRunQuestionResult(BaseModel):
    question_id: str
    answer: str
    retrieved_contexts: list[str]
    expected_answer: str
    lexical_overlap_score: float


class EvaluationRunResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    evaluation_dataset_id: str
    knowledge_dataset_id: str
    organization_id: str
    project_id: str
    workspace_id: str
    total_questions: int
    average_score: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    question_results: list[EvaluationRunQuestionResult]
