from __future__ import annotations

import uuid
import logging
from typing import Any

from app.rag.components.base import BaseChunker
from app.rag.schemas.pipeline_models import RAGChunk, RAGDocument

logger = logging.getLogger(__name__)

class SemanticChunker(BaseChunker):
    """
    True Semantic Chunker that uses embeddings to split documents.
    Splits text where semantic similarity between adjacent sentence groups drops below a threshold.
    """

    name = "semantic"
    description = "True semantic chunker using embeddings and threshold-based splitting."
    requirement: list[str] = ["numpy"]
    config = {"chunk_size": "int", "threshold": "float", "buffer_size": "int"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        chunking = rag_config.get("chunking", {})
        self.chunk_size = chunking.get("chunk_size", 512)
        self.threshold = chunking.get("threshold", 0.70)
        self.buffer_size = chunking.get("buffer_size", 1) # sentences to compare
        
    async def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        from app.rag.managers.component.embedder_manager import EmbedderManager
        
        # 1. Resolve embedder to use for semantic splitting
        embed_mgr = EmbedderManager()
        embedder = embed_mgr.resolve(rag_config)
        
        for document in documents:
            document.chunks = await self._semantic_chunk(document.content, document.document_id, embedder, rag_config)
        return documents

    async def _semantic_chunk(self, text: str, document_id: str, embedder: Any, rag_config: dict[str, Any]) -> list[RAGChunk]:
        import re
        import numpy as np
        
        # 2. Split into sentences (initial candidates)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return []
            
        if len(sentences) == 1:
            return [self._to_chunk(sentences[0], document_id)]

        # 3. Embed all sentences
        # NOTE: Chunk size for embedding API (not same as final chunk size)
        sentence_embeddings_res = await embedder.embed_query_batch(sentences, rag_config)
        sentence_embeddings = np.array([e.vector for e in sentence_embeddings_res])

        # 4. Calculate similarities between adjacent sentences
        similarities = []
        for i in range(len(sentence_embeddings) - 1):
            s1 = sentence_embeddings[i]
            s2 = sentence_embeddings[i+1]
            # Cosine similarity
            sim = np.dot(s1, s2) / (np.linalg.norm(s1) * np.linalg.norm(s2) + 1e-9)
            similarities.append(sim)

        # 5. Determine split points
        chunks_data = []
        current_sentences = [sentences[0]]
        
        for i, sim in enumerate(similarities):
            # Split if similarity < threshold AND current chunk is already somewhat large
            # OR if current chunk exceeds max character size
            current_len = sum(len(s) for s in current_sentences)
            
            if sim < self.threshold or current_len > self.chunk_size * 1.5:
                # Close current chunk
                chunks_data.append(" ".join(current_sentences))
                current_sentences = [sentences[i+1]]
            else:
                current_sentences.append(sentences[i+1])
        
        if current_sentences:
            chunks_data.append(" ".join(current_sentences))

        # 6. Final conversion to RAGChunk
        return [self._to_chunk(content, document_id) for content in chunks_data]

    def _to_chunk(self, content: str, document_id: str) -> RAGChunk:
        return RAGChunk(
            content=content,
            content_without_overlap=content,
            chunk_id=str(uuid.uuid4()),
            document_id=document_id,
            start_i=0, # Simplified tracking
            end_i=len(content),
        )