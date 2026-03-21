from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from app.core.tenancy import TenantContext
from app.modules.evaluation_datasets.schemas import (
    EvaluationDatasetCreate,
    EvaluationDatasetSummary,
    EvaluationQuestionCreate,
    EvaluationQuestionSummary,
    EvaluationRunQuestionResult,
    EvaluationRunRequest,
    EvaluationRunResult,
)

logger = logging.getLogger(__name__)


def _lexical_overlap(predicted: str, expected: str) -> float:
    """Simple token-overlap F1 as a baseline metric."""
    pred_tokens = set(predicted.lower().split())
    exp_tokens = set(expected.lower().split())
    if not pred_tokens or not exp_tokens:
        return 0.0
    common = pred_tokens & exp_tokens
    precision = len(common) / len(pred_tokens)
    recall = len(common) / len(exp_tokens)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


class EvaluationDatasetService:
    def __init__(self, manager: KaragManager) -> None:
        self._mgr = manager
        self._repo = manager.evaluation_datasets_repo

    # ── datasets ──

    def create_dataset(
        self, tenant: TenantContext, payload: EvaluationDatasetCreate
    ) -> EvaluationDatasetSummary:
        row = self._repo.create_dataset(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=payload.workspace_id,
            name=payload.name,
            description=payload.description,
        )
        return EvaluationDatasetSummary(**row)

    def list_datasets(
        self, tenant: TenantContext, workspace_id: str
    ) -> list[EvaluationDatasetSummary]:
        rows = self._repo.list_datasets(workspace_id)
        return [EvaluationDatasetSummary(**r) for r in rows]

    def delete_dataset(self, tenant: TenantContext, dataset_id: str) -> None:
        self._repo.delete_dataset(dataset_id)

    # ── questions ──

    def create_question(
        self, tenant: TenantContext, dataset_id: str, payload: EvaluationQuestionCreate
    ) -> EvaluationQuestionSummary:
        ds = self._repo.get_dataset(dataset_id)
        if not ds:
            raise ValueError(f"Evaluation dataset {dataset_id} not found")
        row = self._repo.create_question(
            evaluation_dataset_id=dataset_id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=ds["workspace_id"],
            question=payload.question,
            expected_answer=payload.expected_answer,
            expected_context=payload.expected_context,
            metadata=payload.metadata,
        )
        return EvaluationQuestionSummary(**row)

    def list_questions(
        self, tenant: TenantContext, dataset_id: str
    ) -> list[EvaluationQuestionSummary]:
        rows = self._repo.list_questions(dataset_id)
        return [EvaluationQuestionSummary(**r) for r in rows]

    # ── evaluation run ──

    async def run_evaluation(
        self, tenant: TenantContext, dataset_id: str, payload: EvaluationRunRequest
    ) -> EvaluationRunResult:
        ds = self._repo.get_dataset(dataset_id)
        if not ds:
            raise ValueError(f"Evaluation dataset {dataset_id} not found")

        questions = self._repo.list_questions(dataset_id)
        workspace_id = ds["workspace_id"]

        question_results: list[EvaluationRunQuestionResult] = []
        total_score = 0.0

        for q in questions:
            try:
                result = await self._mgr.execute_rag_query(
                    tenant=tenant,
                    workspace_id=workspace_id,
                    query=q["question"],
                    dataset_id=payload.knowledge_dataset_id,
                )
                answer = result.answer
                contexts = [c.text for c in result.chunks]
            except Exception as exc:
                logger.warning("Eval question %s failed: %s", q["id"], exc)
                answer = f"Error: {exc}"
                contexts = []

            score = _lexical_overlap(answer, q["expected_answer"])
            total_score += score
            question_results.append(
                EvaluationRunQuestionResult(
                    question_id=q["id"],
                    answer=answer,
                    retrieved_contexts=contexts,
                    expected_answer=q["expected_answer"],
                    lexical_overlap_score=round(score, 4),
                )
            )

        avg_score = total_score / len(questions) if questions else 0.0

        return EvaluationRunResult(
            id=str(uuid.uuid4()),
            evaluation_dataset_id=dataset_id,
            knowledge_dataset_id=payload.knowledge_dataset_id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            total_questions=len(questions),
            average_score=round(avg_score, 4),
            created_at=datetime.now(timezone.utc),
            question_results=question_results,
        )
