from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.config import PlatformSettings
from app.modules.workspaces.schemas import (
    DEFAULT_PROMPT_TEMPLATE,
    ChunkingConfig,
    EmbeddingConfig,
    LlmConfig,
    RAGConfig,
    RerankerConfig,
    RetrieverConfig,
    VectorStoreConfig,
    WorkspaceSetting,
    WorkspaceSettingUpdate,
)


class WorkspaceSettingManager:
    @staticmethod
    def build_default(*, workspace_id: str) -> WorkspaceSetting:
        settings = PlatformSettings()
        return WorkspaceSetting(
            workspace_id=workspace_id,
            embedding=EmbeddingConfig(
                component=settings.rag_default_embedder,
                provider=settings.default_embedding_provider,
                model=settings.default_embedding_model,
                dimension=settings.default_embedding_dimension,
                batch_size=16,
            ),
            chunking=ChunkingConfig(
                component=settings.rag_default_chunker,
                chunk_size=512,
                chunk_overlap=64,
            ),
            vectorstore=VectorStoreConfig(
                component=settings.rag_default_vectorstore,
                distance_metric="cosine",
                index_type="hnsw",
                vector_dimension=settings.default_embedding_dimension,
            ),
            retriever=RetrieverConfig(
                component=settings.rag_default_retriever,
                top_k=3,
                score_threshold=0.0,
            ),
            reranker=RerankerConfig(
                component=settings.rag_default_reranker,
                provider="jina",
                model="cross-encoder-mini",
            ),
            llm=LlmConfig(
                provider=settings.default_llm_provider,
                model=settings.default_llm_model,
                temperature=0.2,
                max_tokens=700,
                streaming=False,
                api_base=settings.llm_base_url,
            ),
            rag=RAGConfig(
                reader=settings.rag_default_reader,
                query_transformer=settings.rag_default_query_transformer,
                generator=settings.rag_default_generator,
                prompt_template=DEFAULT_PROMPT_TEMPLATE,
                max_context_tokens=4000,
                context_compression=False,
                citation_mode="inline",
                context_formatting_template="[{index}] {text}",
            ),
            updated_at=datetime.now(UTC),
        )

    @staticmethod
    def merge(base: WorkspaceSetting, update: WorkspaceSettingUpdate) -> WorkspaceSetting:
        merged_payload = base.model_dump()
        for field_name, value in update.model_dump(exclude_none=True).items():
            if isinstance(value, dict) and isinstance(merged_payload.get(field_name), dict):
                merged_payload[field_name] = {**merged_payload[field_name], **value}
            else:
                merged_payload[field_name] = value

        merged_payload["updated_at"] = datetime.now(UTC)
        merged = WorkspaceSetting(**merged_payload)
        if merged.vectorstore.vector_dimension is None:
            merged.vectorstore.vector_dimension = merged.embedding.dimension
        return merged


build_default_workspace_setting = WorkspaceSettingManager.build_default
merge_workspace_setting = WorkspaceSettingManager.merge
build_default_workspace_rag_config = WorkspaceSettingManager.build_default
merge_workspace_rag_config = WorkspaceSettingManager.merge