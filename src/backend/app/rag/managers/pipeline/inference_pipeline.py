from __future__ import annotations
import logging
from typing import Any, List, AsyncGenerator

from app.rag.managers.pipeline.pre_retrieval_manager import PreRetrievalManager
from app.rag.managers.pipeline.retrieval_manager import RetrievalManager
from app.rag.managers.pipeline.post_retrieval_manager import PostRetrievalManager
from app.rag.schemas.types import ChatMessage, RagContext, RagExecutionResult
from app.modules.workspaces.schemas import WorkspaceSetting

logger = logging.getLogger(__name__)

class InferencePipeline:
    """The Top-Level 4-Stage RAG Pipeline Orchestrator."""

    def __init__(self, rag_manager: Any) -> None:
        self.rag_manager = rag_manager
        self.pre_retrieval = PreRetrievalManager()
        self.retrieval = RetrievalManager(
            vectorstore_manager=rag_manager.vectorstores,
            embedder_manager=rag_manager.embedders
        )
        self.post_retrieval = PostRetrievalManager()

    async def run(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: List[ChatMessage] | None = None,
    ) -> RagExecutionResult:
        """Execute the full 4-stage pipeline."""
        rag_config = setting.model_dump(mode="python")
        history = conversation_history or []

        # Stage 1: Pre-Retrieval (Expansion, Self-Query)
        analysis = await self.pre_retrieval.analyze(query, rag_config, history)
        
        # Stage 2: Retrieval (Hybrid Parallel Search + Fusion)
        retrieval_set = await self.retrieval.retrieve(analysis, rag_config, context)
        
        # Stage 3: Post-Retrieval (Rerank, Mask PII)
        refined = await self.post_retrieval.refine(retrieval_set, rag_config)
        
        # Stage 4: Assembly & Generation
        # Build prompt using the context manager
        messages = self.rag_manager.chat_context.process(
            rag_config,
            query=query,
            retrieved_chunks=refined.ranked_chunks,
            conversation_history=history,
        )
        
        # Generate Answer
        answer = await self.rag_manager.inference.process(rag_config, messages)

        trace = [
            f"Pre-retrieval completed in {analysis.metadata.get('elapsed_ms', 0)}ms",
            f"Transformed query: {analysis.condensed_query}",
            f"Retrieval completed in {retrieval_set.metadata.get('elapsed_ms', 0)}ms across {retrieval_set.metadata.get('search_count', 0)} search(es)",
            f"Post-retrieval completed in {refined.metadata.get('elapsed_ms', 0)}ms",
            f"Context chunks used: {len(refined.ranked_chunks)}",
        ]
        
        return RagExecutionResult(
            answer=answer,
            prompt=messages[-1].content,
            transformed_query=analysis.condensed_query,
            chunks=refined.ranked_chunks,
            trace=trace,
        )

    async def run_stream(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: List[ChatMessage] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Execute the full 4-stage pipeline with streaming output."""
        rag_config = setting.model_dump(mode="python")
        history = conversation_history or []

        # Stages 1-3 (same as run)
        analysis = await self.pre_retrieval.analyze(query, rag_config, history)
        retrieval_set = await self.retrieval.retrieve(analysis, rag_config, context)
        refined = await self.post_retrieval.refine(retrieval_set, rag_config)
        
        # Stage 4: Streaming Generation
        messages = self.rag_manager.chat_context.process(
            rag_config, query=query, retrieved_chunks=refined.ranked_chunks, conversation_history=history
        )
        
        async for token in self.rag_manager.inference.process_stream(rag_config, messages):
            yield token
