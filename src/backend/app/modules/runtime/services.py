from __future__ import annotations

from fastapi import HTTPException, status

from app.core.container import PlatformContainer
from app.core.events import PIPELINE_FINISHED, PIPELINE_STARTED, TransactionalOutbox, build_event
from app.core.ports import ChatMessage
from app.core.provider_selection import resolve_embedding_provider_name
from app.core.tenancy import TenantContext, require_workspace_scope
from app.core.vector_collections import resolve_collection_name
from app.modules.runtime.schemas import ChatCompletionRequest, ChatCompletionResponse
from app.modules.runtime.schemas import EmbeddingRequest, EmbeddingResponse, RagChunkResult
from app.modules.runtime.schemas import RagQueryRequest, RagQueryResponse, RuntimeDocumentSummary
from app.modules.runtime.schemas import RuntimeModelSummary
from app.modules.workspaces.schemas import build_default_workspace_rag_config


def _truncate_context(chunks: list[RagChunkResult], max_context_tokens: int) -> list[RagChunkResult]:
    if max_context_tokens <= 0:
        return chunks
    total = 0
    selected: list[RagChunkResult] = []
    for chunk in chunks:
        token_estimate = max(len(chunk.text.split()), 1)
        if selected and total + token_estimate > max_context_tokens:
            break
        selected.append(chunk)
        total += token_estimate
    return selected or chunks[:1]


def _format_context(chunks: list[RagChunkResult], template: str) -> str:
    lines: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        lines.append(
            template.format(
                index=index,
                text=chunk.text,
                document_title=chunk.document_title,
                score=f"{chunk.score:.3f}",
            )
        )
    return "\n".join(lines)


class RuntimeService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def list_models(self) -> list[RuntimeModelSummary]:
        llm_models = [
            RuntimeModelSummary(
                provider=name,
                kind="llm",
                models=self.container.llm_providers.get(name).list_models(),
            )
            for name in self.container.llm_providers.names()
        ]
        embedding_models = [
            RuntimeModelSummary(
                provider=name,
                kind="embedding",
                models=self.container.embedding_providers.get(name).list_models(),
            )
            for name in self.container.embedding_providers.names()
        ]
        return llm_models + embedding_models

    def embeddings(self, payload: EmbeddingRequest) -> EmbeddingResponse:
        provider_name = payload.provider or self.container.embedding_providers.default_name
        provider = self.container.embedding_providers.get(provider_name)
        model = payload.model or provider.list_models()[0]
        return EmbeddingResponse(
            provider=provider_name,
            model=model,
            data=provider.embed_texts(payload.input, model=model),
        )

    def chat(
        self,
        tenant: TenantContext,
        payload: ChatCompletionRequest,
    ) -> ChatCompletionResponse:
        provider_name = payload.provider or self.container.llm_providers.default_name
        provider = self.container.llm_providers.get(provider_name)
        model = payload.model or provider.list_models()[0]
        workspace_id = payload.workspace_id or tenant.workspace_id
        completion = provider.chat(
            [ChatMessage(role=message["role"], content=message["content"]) for message in payload.messages],
            model=model,
        )
        self.container.telemetry.record_trace(
            trace_type="chat_completion",
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            captured={"messages": payload.messages, "response": completion.content},
            metrics={
                "prompt_tokens": completion.prompt_tokens,
                "completion_tokens": completion.completion_tokens,
                "latency_ms": completion.latency_ms,
            },
        )
        return ChatCompletionResponse(
            provider=provider_name,
            model=model,
            content=completion.content,
            usage={
                "prompt_tokens": completion.prompt_tokens,
                "completion_tokens": completion.completion_tokens,
                "total_tokens": completion.total_tokens,
            },
        )

    def rag_query(self, tenant: TenantContext, payload: RagQueryRequest) -> RagQueryResponse:
        workspace_id = require_workspace_scope(tenant, payload.workspace_id)
        dataset = self.container.knowledge_datasets.get(tenant, payload.knowledge_dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge dataset not found for this tenant.",
            )
        if dataset.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Knowledge dataset does not belong to the active workspace.",
            )

        rag_config = self.container.workspace_rag_configs.get(tenant, workspace_id)
        if not rag_config:
            rag_config = self.container.workspace_rag_configs.upsert(
                build_default_workspace_rag_config(
                    workspace_id=workspace_id,
                    organization_id=tenant.organization_id,
                    project_id=tenant.project_id,
                )
            )

        llm_provider_name = (
            payload.llm_provider
            or rag_config.llm_config.provider
            or self.container.llm_providers.default_name
        )
        llm_provider = self.container.llm_providers.get(llm_provider_name)
        llm_model = payload.llm_model or rag_config.llm_config.model or llm_provider.list_models()[0]
        top_k = payload.top_k if payload.top_k is not None else rag_config.retrieval_config.top_k

        try:
            vector_store = self.container.vector_stores.get(rag_config.vector_store_type)
        except KeyError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=PIPELINE_STARTED,
                tenant=tenant,
                resource_id=dataset.id,
                payload={"pipeline": "rag_query", "query": payload.query},
                workspace_id=workspace_id,
            )
        )
        embedding_provider_name = (
            rag_config.embedding_provider
            or resolve_embedding_provider_name(
                dataset.embedding_model,
                self.container.embedding_providers.default_name,
            )
        )
        query_embedding = self.container.embedding_providers.get(embedding_provider_name).embed_texts(
            [payload.query],
            model=dataset.embedding_model,
        )[0]
        collection_name = (
            rag_config.vector_store_config.collection_name
            or resolve_collection_name(
                self.container.settings.default_qdrant_collection,
                dataset.embedding_model,
            )
        )
        matches = vector_store.search(
            collection_name,
            payload.query,
            {
                "org_id": tenant.organization_id,
                "project_id": tenant.project_id,
                "workspace_id": workspace_id,
                "dataset_id": dataset.id,
            },
            limit=top_k,
            query_vector=query_embedding,
        )
        chunks = [
            RagChunkResult(
                chunk_id=result.payload["chunk_id"],
                document_id=result.payload["document_id"],
                document_title=result.payload.get("document_title", "Untitled"),
                score=result.score,
                text=result.payload.get("chunk_text", ""),
            )
            for result in matches
            if result.score >= rag_config.retrieval_config.score_threshold
        ]
        chunks = _truncate_context(chunks, rag_config.reading_config.max_context_tokens)
        context = _format_context(chunks, rag_config.reading_config.context_formatting_template)
        prompt = rag_config.prompt_template.replace("{{context}}", context).replace(
            "{{question}}", payload.query
        )
        completion = llm_provider.chat([ChatMessage(role="user", content=prompt)], model=llm_model)
        outbox.stage(
            build_event(
                event_type=PIPELINE_FINISHED,
                tenant=tenant,
                resource_id=dataset.id,
                payload={
                    "pipeline": "rag_query",
                    "retrieved_chunks": len(chunks),
                    "vector_store": rag_config.vector_store_type,
                },
                workspace_id=workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        self.container.telemetry.record_trace(
            trace_type="rag_query",
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            resource_id=dataset.id,
            captured={
                "query": payload.query,
                "retrieved_chunks": [chunk.text for chunk in chunks],
                "prompt": prompt,
                "response": completion.content,
            },
            metrics={
                "latency_ms": completion.latency_ms,
                "prompt_tokens": completion.prompt_tokens,
                "completion_tokens": completion.completion_tokens,
                "retrieved_chunk_count": len(chunks),
                "top_k": top_k,
            },
        )
        return RagQueryResponse(
            answer=completion.content,
            provider=llm_provider_name,
            model=llm_model,
            prompt=prompt,
            chunks=chunks,
            usage={
                "prompt_tokens": completion.prompt_tokens,
                "completion_tokens": completion.completion_tokens,
                "total_tokens": completion.total_tokens,
            },
        )

    def list_documents(self, tenant: TenantContext, workspace_id: str) -> list[RuntimeDocumentSummary]:
        require_workspace_scope(tenant, workspace_id)
        if not self.container.workspaces.get(tenant, workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return [
            RuntimeDocumentSummary(**document.model_dump())
            for document in self.container.documents.list_for_workspace(tenant, workspace_id)
        ]
