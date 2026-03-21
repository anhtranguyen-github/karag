from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select

from app.core.database import DatabaseManager, EvaluationDatasetRow, EvaluationQuestionRow


class EvaluationDatasetRepository:
    """Persistence for evaluation datasets and questions."""

    def __init__(self, db: DatabaseManager) -> None:
        self._db = db

    # ── datasets ──

    def create_dataset(
        self,
        organization_id: str,
        project_id: str,
        workspace_id: str,
        name: str,
        description: str | None,
    ) -> dict[str, Any]:
        row = EvaluationDatasetRow(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            project_id=project_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            created_at=datetime.now(UTC),
        )
        with self._db.session() as session:
            session.add(row)
        return self._dataset_to_dict(row)

    def list_datasets(self, workspace_id: str) -> list[dict[str, Any]]:
        with self._db.session() as session:
            rows = session.scalars(
                select(EvaluationDatasetRow).where(
                    EvaluationDatasetRow.workspace_id == workspace_id
                )
            ).all()
            return [self._dataset_to_dict(r) for r in rows]

    def get_dataset(self, dataset_id: str) -> dict[str, Any] | None:
        with self._db.session() as session:
            row = session.get(EvaluationDatasetRow, dataset_id)
            return self._dataset_to_dict(row) if row else None

    def delete_dataset(self, dataset_id: str) -> None:
        with self._db.session() as session:
            # Delete questions first
            questions = session.scalars(
                select(EvaluationQuestionRow).where(
                    EvaluationQuestionRow.evaluation_dataset_id == dataset_id
                )
            ).all()
            for q in questions:
                session.delete(q)

            row = session.get(EvaluationDatasetRow, dataset_id)
            if row:
                session.delete(row)

    # ── questions ──

    def create_question(
        self,
        evaluation_dataset_id: str,
        organization_id: str,
        project_id: str,
        workspace_id: str,
        question: str,
        expected_answer: str,
        expected_context: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        row = EvaluationQuestionRow(
            id=str(uuid.uuid4()),
            evaluation_dataset_id=evaluation_dataset_id,
            organization_id=organization_id,
            project_id=project_id,
            workspace_id=workspace_id,
            question=question,
            expected_answer=expected_answer,
            expected_context=expected_context,
            metadata_json=metadata or {},
            created_at=datetime.now(UTC),
        )
        with self._db.session() as session:
            session.add(row)
        return self._question_to_dict(row)

    def list_questions(self, dataset_id: str) -> list[dict[str, Any]]:
        with self._db.session() as session:
            rows = session.scalars(
                select(EvaluationQuestionRow).where(
                    EvaluationQuestionRow.evaluation_dataset_id == dataset_id
                )
            ).all()
            return [self._question_to_dict(r) for r in rows]

    # ── helpers ──

    @staticmethod
    def _dataset_to_dict(row: EvaluationDatasetRow) -> dict[str, Any]:
        return {
            "id": row.id,
            "organization_id": row.organization_id,
            "project_id": row.project_id,
            "workspace_id": row.workspace_id,
            "name": row.name,
            "description": row.description,
            "created_at": row.created_at,
        }

    @staticmethod
    def _question_to_dict(row: EvaluationQuestionRow) -> dict[str, Any]:
        return {
            "id": row.id,
            "evaluation_dataset_id": row.evaluation_dataset_id,
            "organization_id": row.organization_id,
            "project_id": row.project_id,
            "workspace_id": row.workspace_id,
            "question": row.question,
            "expected_answer": row.expected_answer,
            "expected_context": row.expected_context,
            "metadata": row.metadata_json,
            "created_at": row.created_at,
        }
