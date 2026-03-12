from __future__ import annotations

from datetime import UTC, datetime

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
                component="multi_vector",
                provider=settings.default_embedding_provider,
                model=settings.default_embedding_model,
                dimension=settings.default_embedding_dimension,
                batch_size=16,
                api_base=settings.embedding_base_url,
                api_key=settings.jina_api_key,
                task="text-matching",
            ),
            chunking=ChunkingConfig(
                component="semantic",
                chunk_size=settings.default_chunk_size,
                chunk_overlap=64,
                separators=["\n\n", "\n", " ", ""],
                threshold=0.72,
                buffer_size=1,
            ),
            vectorstore=VectorStoreConfig(
                component="qdrant",
                collection_name=settings.default_qdrant_collection,
                distance_metric="cosine",
                index_type="hnsw",
                vector_dimension=settings.default_embedding_dimension,
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
            ),
            retriever=RetrieverConfig(
                component="multi_stage",
                top_k=25,
                score_threshold=0.0,
                final_top_k=10,
            ),
            reranker=RerankerConfig(
                component="colbert",
                provider="late-interaction",
                model="colbert",
                top_k=5,
                api_base=None,
                api_key=None,
            ),
            llm=LlmConfig(
                provider=settings.default_llm_provider,
                model=settings.default_llm_model,
                temperature=0.2,
                max_tokens=2048,
                streaming=True,
                api_base=settings.llm_base_url,
                api_key=settings.openai_api_key or "omniroute-local",
            ),
            rag=RAGConfig(
                reader="marker",
                query_transformer="hyde",
                self_query="openai_self_query",
                pii_masking=True,
                generator="openai",
                prompt_template=DEFAULT_PROMPT_TEMPLATE,
                max_context_tokens=4000,
                context_compression=False,
                citation_mode="inline",
                context_formatting_template="[{index}] {text}",
                chat_context="simple",
                use_llm=True,
                force_ocr=True,
                redo_inline_math=True,
                html_tables_in_markdown=True,
                paginate_output=True,
                device="auto",
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
