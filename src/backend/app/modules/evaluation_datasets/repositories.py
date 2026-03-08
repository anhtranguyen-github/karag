from __future__ import annotations

from sqlalchemy import delete, select

from app.core.database import DatabaseManager, EvaluationDatasetRow, EvaluationQuestionRow
from app.core.database import EvaluationRunRow
from app.core.tenancy import TenantContext
from app.modules.evaluation_datasets.schemas import EvaluationDatasetSummary
from app.modules.evaluation_datasets.schemas import EvaluationQuestionSummary, EvaluationRunQuestionResult
from app.modules.evaluation_datasets.schemas import EvaluationRunResult


def _dataset_to_schema(row: EvaluationDatasetRow) -> EvaluationDatasetSummary:
    return EvaluationDatasetSummary(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
    )


def _question_to_schema(row: EvaluationQuestionRow) -> EvaluationQuestionSummary:
    return EvaluationQuestionSummary(
        id=row.id,
        evaluation_dataset_id=row.evaluation_dataset_id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        question=row.question,
        expected_answer=row.expected_answer,
        expected_context=row.expected_context,
        metadata=row.metadata_json,
        created_at=row.created_at,
    )


def _run_to_schema(row: EvaluationRunRow) -> EvaluationRunResult:
    return EvaluationRunResult(
        id=row.id,
        evaluation_dataset_id=row.evaluation_dataset_id,
        knowledge_dataset_id=row.knowledge_dataset_id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        total_questions=row.total_questions,
        average_score=row.average_score,
        created_at=row.created_at,
        question_results=[EvaluationRunQuestionResult(**item) for item in row.question_results_json],
    )


class EvaluationDatasetRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create_dataset(self, dataset: EvaluationDatasetSummary) -> EvaluationDatasetSummary:
        with self.database.session() as session:
            session.add(
                EvaluationDatasetRow(
                    id=dataset.id,
                    organization_id=dataset.organization_id,
                    project_id=dataset.project_id,
                    workspace_id=dataset.workspace_id,
                    name=dataset.name,
                    description=dataset.description,
                    created_at=dataset.created_at,
                )
            )
        return dataset

    def list_datasets(
        self,
        tenant: TenantContext,
        workspace_id: str,
    ) -> list[EvaluationDatasetSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(EvaluationDatasetRow).where(
                    EvaluationDatasetRow.organization_id == tenant.organization_id,
                    EvaluationDatasetRow.project_id == tenant.project_id,
                    EvaluationDatasetRow.workspace_id == workspace_id,
                )
            ).all()
        return [_dataset_to_schema(row) for row in rows]

    def get_dataset(
        self,
        tenant: TenantContext,
        dataset_id: str,
    ) -> EvaluationDatasetSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(EvaluationDatasetRow).where(
                    EvaluationDatasetRow.id == dataset_id,
                    EvaluationDatasetRow.organization_id == tenant.organization_id,
                    EvaluationDatasetRow.project_id == tenant.project_id,
                )
            )
        return _dataset_to_schema(row) if row else None

    def delete_dataset(
        self,
        tenant: TenantContext,
        dataset_id: str,
    ) -> EvaluationDatasetSummary | None:
        dataset = self.get_dataset(tenant, dataset_id)
        if not dataset:
            return None
        self.delete_questions(dataset_id)
        with self.database.session() as session:
            session.execute(delete(EvaluationDatasetRow).where(EvaluationDatasetRow.id == dataset_id))
        return dataset

    def create_question(self, question: EvaluationQuestionSummary) -> EvaluationQuestionSummary:
        with self.database.session() as session:
            session.add(
                EvaluationQuestionRow(
                    id=question.id,
                    evaluation_dataset_id=question.evaluation_dataset_id,
                    organization_id=question.organization_id,
                    project_id=question.project_id,
                    workspace_id=question.workspace_id,
                    question=question.question,
                    expected_answer=question.expected_answer,
                    expected_context=question.expected_context,
                    metadata_json=question.metadata,
                    created_at=question.created_at,
                )
            )
        return question

    def list_questions(
        self,
        tenant: TenantContext,
        dataset_id: str,
    ) -> list[EvaluationQuestionSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(EvaluationQuestionRow).where(
                    EvaluationQuestionRow.evaluation_dataset_id == dataset_id,
                    EvaluationQuestionRow.organization_id == tenant.organization_id,
                    EvaluationQuestionRow.project_id == tenant.project_id,
                )
            ).all()
        return [_question_to_schema(row) for row in rows]

    def delete_questions(self, dataset_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(EvaluationQuestionRow).where(
                    EvaluationQuestionRow.evaluation_dataset_id == dataset_id
                )
            )

    def store_run(self, run: EvaluationRunResult) -> EvaluationRunResult:
        with self.database.session() as session:
            session.add(
                EvaluationRunRow(
                    id=run.id,
                    evaluation_dataset_id=run.evaluation_dataset_id,
                    knowledge_dataset_id=run.knowledge_dataset_id,
                    organization_id=run.organization_id,
                    project_id=run.project_id,
                    workspace_id=run.workspace_id,
                    total_questions=run.total_questions,
                    average_score=run.average_score,
                    question_results_json=[result.model_dump() for result in run.question_results],
                    created_at=run.created_at,
                )
            )
        return run

    def list_runs(self, tenant: TenantContext) -> list[EvaluationRunResult]:
        with self.database.session() as session:
            rows = session.scalars(
                select(EvaluationRunRow).where(
                    EvaluationRunRow.organization_id == tenant.organization_id,
                    EvaluationRunRow.project_id == tenant.project_id,
                )
            ).all()
        return [_run_to_schema(row) for row in rows]
