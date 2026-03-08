from __future__ import annotations

from fastapi import HTTPException, status

from app.core.container import PlatformContainer
from app.core.events import DATASET_UPDATED, EVALUATION_COMPLETED, PIPELINE_FINISHED
from app.core.events import PIPELINE_STARTED, TransactionalOutbox, build_event
from app.core.ports import ChatMessage
from app.core.provider_selection import resolve_embedding_provider_name
from app.core.tenancy import TenantContext, require_workspace_scope
from app.core.vector_collections import resolve_collection_name
from app.modules.evaluation_datasets.schemas import EvaluationDatasetCreate
from app.modules.evaluation_datasets.schemas import EvaluationDatasetSummary
from app.modules.evaluation_datasets.schemas import EvaluationQuestionCreate
from app.modules.evaluation_datasets.schemas import EvaluationQuestionSummary
from app.modules.evaluation_datasets.schemas import EvaluationRunQuestionResult, EvaluationRunRequest
from app.modules.evaluation_datasets.schemas import EvaluationRunResult


class EvaluationDatasetService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def _require_workspace(self, tenant: TenantContext, workspace_id: str) -> str:
        workspace_id = require_workspace_scope(tenant, workspace_id)
        if not self.container.workspaces.get(tenant, workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace_id

    def create_dataset(
        self,
        tenant: TenantContext,
        payload: EvaluationDatasetCreate,
    ) -> EvaluationDatasetSummary:
        workspace_id = self._require_workspace(tenant, payload.workspace_id)
        dataset = EvaluationDatasetSummary(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
        )
        created = self.container.evaluation_datasets.create_dataset(dataset)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DATASET_UPDATED,
                tenant=tenant,
                resource_id=created.id,
                payload={"action": "created", "dataset_type": "evaluation"},
                workspace_id=workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        return created

    def list_datasets(self, tenant: TenantContext, workspace_id: str) -> list[EvaluationDatasetSummary]:
        self._require_workspace(tenant, workspace_id)
        return self.container.evaluation_datasets.list_datasets(tenant, workspace_id)

    def get_dataset(self, tenant: TenantContext, dataset_id: str) -> EvaluationDatasetSummary:
        dataset = self.container.evaluation_datasets.get_dataset(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        return dataset

    def delete_dataset(self, tenant: TenantContext, dataset_id: str) -> None:
        dataset = self.get_dataset(tenant, dataset_id)
        self.container.evaluation_datasets.delete_dataset(tenant, dataset.id)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DATASET_UPDATED,
                tenant=tenant,
                resource_id=dataset.id,
                payload={"action": "deleted", "dataset_type": "evaluation"},
                workspace_id=dataset.workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)

    def add_question(
        self,
        tenant: TenantContext,
        dataset_id: str,
        payload: EvaluationQuestionCreate,
    ) -> EvaluationQuestionSummary:
        dataset = self.get_dataset(tenant, dataset_id)
        question = EvaluationQuestionSummary(
            evaluation_dataset_id=dataset.id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=dataset.workspace_id,
            question=payload.question,
            expected_answer=payload.expected_answer,
            expected_context=payload.expected_context,
            metadata=payload.metadata,
        )
        created = self.container.evaluation_datasets.create_question(question)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DATASET_UPDATED,
                tenant=tenant,
                resource_id=dataset.id,
                payload={"action": "question_added", "question_id": created.id},
                workspace_id=dataset.workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        return created

    def list_questions(
        self,
        tenant: TenantContext,
        dataset_id: str,
    ) -> list[EvaluationQuestionSummary]:
        dataset = self.get_dataset(tenant, dataset_id)
        return self.container.evaluation_datasets.list_questions(tenant, dataset.id)

    def run_evaluation(
        self,
        tenant: TenantContext,
        dataset_id: str,
        payload: EvaluationRunRequest,
    ) -> EvaluationRunResult:
        evaluation_dataset = self.get_dataset(tenant, dataset_id)
        knowledge_dataset = self.container.knowledge_datasets.get(tenant, payload.knowledge_dataset_id)
        if not knowledge_dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge dataset not found for this tenant.",
            )
        if knowledge_dataset.workspace_id != evaluation_dataset.workspace_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Knowledge and evaluation datasets must belong to the same workspace.",
            )
        llm_provider = self.container.llm_providers.get(payload.llm_provider)
        questions = self.container.evaluation_datasets.list_questions(tenant, evaluation_dataset.id)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=PIPELINE_STARTED,
                tenant=tenant,
                resource_id=evaluation_dataset.id,
                payload={"pipeline": "evaluation", "knowledge_dataset_id": knowledge_dataset.id},
                workspace_id=evaluation_dataset.workspace_id,
            )
        )
        embedding_provider_name = resolve_embedding_provider_name(
            knowledge_dataset.embedding_model,
            self.container.embedding_providers.default_name,
        )
        collection_name = resolve_collection_name(
            self.container.settings.default_qdrant_collection,
            knowledge_dataset.embedding_model,
        )
        results: list[EvaluationRunQuestionResult] = []
        for question in questions:
            query_embedding = self.container.embedding_providers.get(
                embedding_provider_name
            ).embed_texts(
                [question.question],
                model=knowledge_dataset.embedding_model,
            )[0]
            matches = self.container.vector_store.search(
                collection_name,
                question.question,
                {
                    "org_id": tenant.organization_id,
                    "project_id": tenant.project_id,
                    "workspace_id": evaluation_dataset.workspace_id,
                    "dataset_id": knowledge_dataset.id,
                },
                limit=payload.top_k,
                query_vector=query_embedding,
            )
            contexts = [result.payload.get("chunk_text", "") for result in matches]
            prompt = (
                "Use the retrieved context to answer the question.\n\n"
                f"Question: {question.question}\n\nContext:\n" + "\n\n".join(contexts)
            )
            completion = llm_provider.chat(
                [ChatMessage(role="user", content=prompt)],
                model=payload.llm_model,
            )
            expected_tokens = set(question.expected_answer.lower().split())
            answer_tokens = set(completion.content.lower().split())
            overlap = len(expected_tokens.intersection(answer_tokens))
            score = round(overlap / len(expected_tokens), 4) if expected_tokens else 0.0
            results.append(
                EvaluationRunQuestionResult(
                    question_id=question.id,
                    answer=completion.content,
                    retrieved_contexts=contexts,
                    expected_answer=question.expected_answer,
                    lexical_overlap_score=score,
                )
            )
        average_score = round(
            sum(result.lexical_overlap_score for result in results) / len(results),
            4,
        ) if results else 0.0
        run = self.container.evaluation_datasets.store_run(
            EvaluationRunResult(
                evaluation_dataset_id=evaluation_dataset.id,
                knowledge_dataset_id=knowledge_dataset.id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=evaluation_dataset.workspace_id,
                total_questions=len(results),
                average_score=average_score,
                question_results=results,
            )
        )
        outbox.stage(
            build_event(
                event_type=PIPELINE_FINISHED,
                tenant=tenant,
                resource_id=run.id,
                payload={"pipeline": "evaluation", "average_score": average_score},
                workspace_id=evaluation_dataset.workspace_id,
            )
        )
        outbox.stage(
            build_event(
                event_type=EVALUATION_COMPLETED,
                tenant=tenant,
                resource_id=run.id,
                payload={
                    "evaluation_dataset_id": evaluation_dataset.id,
                    "knowledge_dataset_id": knowledge_dataset.id,
                    "average_score": average_score,
                },
                workspace_id=evaluation_dataset.workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        self.container.telemetry.record_trace(
            trace_type="evaluation_run",
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=evaluation_dataset.workspace_id,
            resource_id=run.id,
            captured={
                "evaluation_dataset_id": evaluation_dataset.id,
                "knowledge_dataset_id": knowledge_dataset.id,
                "questions": [question.question for question in questions],
            },
            metrics={"average_score": average_score, "question_count": len(results)},
        )
        return run
