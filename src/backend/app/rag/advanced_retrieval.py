"""
Advanced Retrieval Strategies for RAG

Implements production patterns from llm-app-patterns skill:
1. Multi-query retrieval - Generate variations for better recall
2. Contextual compression - Compress retrieved documents to relevant parts
3. Hybrid search fusion - Reciprocal Rank Fusion for combining results
"""

import asyncio
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import structlog
from src.backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


@dataclass
class RetrievalResult:
    """Single retrieval result with metadata."""

    text: str
    score: float
    metadata: dict[str, Any]
    source: str = "unknown"


class MultiQueryRetriever:
    """
    Generate multiple query variations to improve recall.

    Based on the principle that different phrasings of the same question
    may match different relevant documents.
    """

    QUERY_VARIATION_PROMPT = """Generate {n} different versions of the user's question to retrieve relevant documents from a vector database.
    
Original question: {query}

Your task:
1. Rephrase the question using different wording
2. Break it down into sub-questions if complex
3. Use synonyms and alternative phrasings
4. Focus on different aspects of the question

Provide exactly {n} variations, one per line:
1. 
2. 
3. """

    def __init__(self, llm_client, num_variations: int = 3):
        self.llm = llm_client
        self.num_variations = num_variations

    async def generate_variations(self, query: str) -> list[str]:
        """Generate query variations using LLM."""
        with tracer.start_as_current_span("rag.multi_query.generate"):
            prompt = self.QUERY_VARIATION_PROMPT.format(n=self.num_variations, query=query)

            try:
                response = await self.llm.generate(prompt)
                variations = self._parse_variations(response)

                # Always include original
                variations.insert(0, query)

                logger.debug(
                    "multi_query_variations_generated",
                    original=query[:50],
                    variations=len(variations),
                )

                return variations
            except Exception as e:
                logger.warning("multi_query_generation_failed", error=str(e))
                return [query]  # Fallback to original

    def _parse_variations(self, response: str) -> list[str]:
        """Parse numbered variations from LLM output."""
        variations = []
        for line in response.strip().split("\n"):
            line = line.strip()
            # Remove numbering like "1. " or "1) "
            if line and (line[0].isdigit() or line.startswith("-")):
                # Find first space or period after number
                for i, char in enumerate(line):
                    if char in ".) " and i < 5:
                        variations.append(line[i + 1 :].strip())
                        break

        # Clean and filter
        return [v for v in variations if len(v) > 5][: self.num_variations]

    async def retrieve(
        self,
        query: str,
        retriever_fn: callable,
        top_k_per_query: int = 5,
    ) -> list[RetrievalResult]:
        """
        Retrieve using multiple query variations and merge results.

        Args:
            query: Original user query
            retriever_fn: Async function that takes query and returns results
            top_k_per_query: Number of results per variation

        Returns:
            Merged and deduplicated results
        """
        with tracer.start_as_current_span("rag.multi_query.retrieve"):
            variations = await self.generate_variations(query)

            # Retrieve for all variations concurrently
            tasks = [retriever_fn(var, top_k_per_query) for var in variations]
            results_per_query = await asyncio.gather(*tasks, return_exceptions=True)

            # Flatten and deduplicate using Reciprocal Rank Fusion
            all_results = []
            for results in results_per_query:
                if isinstance(results, Exception):
                    continue
                all_results.extend(results)

            fused = self._reciprocal_rank_fusion(all_results, k=60)

            logger.info(
                "multi_query_retrieval_complete",
                variations=len(variations),
                total_results=len(all_results),
                fused_results=len(fused),
            )

            return fused

    def _reciprocal_rank_fusion(
        self,
        results: list[RetrievalResult],
        k: int = 60,
    ) -> list[RetrievalResult]:
        """
        Merge results using Reciprocal Rank Fusion.

        Formula: score = sum(1 / (k + rank)) for each document
        """
        # Group by document text (or use hash)
        scores: dict[str, float] = {}
        doc_map: dict[str, RetrievalResult] = {}

        for i, result in enumerate(results):
            # Use text content as key (simplified)
            key = hash(result.text) % 10000000
            key_str = str(key)

            rank = i + 1
            score = 1.0 / (k + rank)

            scores[key_str] = scores.get(key_str, 0) + score
            if key_str not in doc_map:
                doc_map[key_str] = result

        # Sort by fused score
        sorted_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)

        return [doc_map[k] for k in sorted_keys]


class ContextualCompressor:
    """
    Compress retrieved documents to relevant parts only.

    Reduces context window usage and improves answer quality by
    extracting only the relevant sections from retrieved documents.
    """

    COMPRESSION_PROMPT = """Given the following question and document, extract only the parts of the document that are relevant to answering the question.

Question: {question}

Document:
{document}

Instructions:
1. Extract verbatim text that helps answer the question
2. Preserve context and surrounding sentences
3. If nothing is relevant, respond with "[NO_RELEVANT_CONTENT]"
4. Do not summarize or paraphrase

Relevant excerpt:"""

    def __init__(self, llm_client, max_tokens_per_doc: int = 200):
        self.llm = llm_client
        self.max_tokens = max_tokens_per_doc

    async def compress(
        self,
        query: str,
        documents: list[RetrievalResult],
        compress_ratio: float = 0.5,
    ) -> list[RetrievalResult]:
        """
        Compress documents to relevant parts.

        Args:
            query: User query
            documents: Retrieved documents
            compress_ratio: Target compression ratio

        Returns:
            Compressed documents
        """
        with tracer.start_as_current_span("rag.contextual_compress"):
            compressed = []

            for doc in documents:
                # Skip short documents
                if len(doc.text) < 200:
                    compressed.append(doc)
                    continue

                try:
                    excerpt = await self._extract_relevant_parts(query, doc.text)

                    if excerpt and "[NO_RELEVANT_CONTENT]" not in excerpt:
                        compressed.append(
                            RetrievalResult(
                                text=excerpt,
                                score=doc.score,
                                metadata={**doc.metadata, "compressed": True},
                                source=doc.source,
                            )
                        )
                    else:
                        # Keep original if nothing relevant found
                        compressed.append(doc)

                except Exception as e:
                    logger.warning("compression_failed", error=str(e))
                    compressed.append(doc)

            logger.info(
                "contextual_compression_complete",
                input_docs=len(documents),
                output_docs=len(compressed),
            )

            return compressed

    async def _extract_relevant_parts(
        self,
        query: str,
        document: str,
    ) -> str:
        """Extract relevant parts using LLM."""
        prompt = self.COMPRESSION_PROMPT.format(
            question=query,
            document=document[:4000],  # Truncate long docs
        )

        response = await self.llm.generate(prompt)
        return response.strip()


class HybridRetriever:
    """
    Combine semantic and keyword search with fusion.

    Implements hybrid search pattern from llm-app-patterns:
    - Semantic search for conceptual understanding
    - Keyword/BM25 for exact matches
    - Reciprocal Rank Fusion for combining
    """

    def __init__(
        self,
        semantic_retriever: callable,
        keyword_retriever: callable,
        alpha: float = 0.5,
    ):
        """
        Args:
            semantic_retriever: Function for vector similarity search
            keyword_retriever: Function for keyword/BM25 search
            alpha: Balance factor (1.0 = pure semantic, 0.0 = pure keyword)
        """
        self.semantic = semantic_retriever
        self.keyword = keyword_retriever
        self.alpha = alpha

    async def retrieve(
        self,
        query: str,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        """
        Perform hybrid retrieval.

        Args:
            query: User query
            top_k: Number of final results

        Returns:
            Fused results from both methods
        """
        with tracer.start_as_current_span("rag.hybrid_retrieve"):
            # Run both searches concurrently
            semantic_task = self.semantic(query, top_k * 2)
            keyword_task = self.keyword(query, top_k * 2)

            semantic_results, keyword_results = await asyncio.gather(
                semantic_task,
                keyword_task,
                return_exceptions=True,
            )

            if isinstance(semantic_results, Exception):
                logger.warning("semantic_search_failed", error=str(semantic_results))
                semantic_results = []

            if isinstance(keyword_results, Exception):
                logger.warning("keyword_search_failed", error=str(keyword_results))
                keyword_results = []

            # Weighted fusion
            fused = self._weighted_fusion(
                semantic_results,
                keyword_results,
                self.alpha,
            )

            return fused[:top_k]

    def _weighted_fusion(
        self,
        semantic: list[RetrievalResult],
        keyword: list[RetrievalResult],
        alpha: float,
    ) -> list[RetrievalResult]:
        """Fuse results with weighting."""
        scores: dict[str, float] = {}
        doc_map: dict[str, RetrievalResult] = {}

        # Score semantic results
        for rank, result in enumerate(semantic):
            key = hash(result.text) % 10000000
            key_str = str(key)
            scores[key_str] = scores.get(key_str, 0) + alpha * (1.0 / (rank + 1))
            doc_map.setdefault(key_str, result)

        # Score keyword results
        for rank, result in enumerate(keyword):
            key = hash(result.text) % 10000000
            key_str = str(key)
            scores[key_str] = scores.get(key_str, 0) + (1 - alpha) * (1.0 / (rank + 1))
            doc_map.setdefault(key_str, result)

        # Sort by fused score
        sorted_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        return [doc_map[k] for k in sorted_keys]


# Convenience factory
def create_advanced_retriever(
    llm_client,
    semantic_retriever: Callable,
    keyword_retriever: Callable | None = None,
    enable_multi_query: bool = True,
    enable_compression: bool = True,
) -> Any:
    """
    Factory to create configured advanced retriever.

    Args:
        llm_client: LLM client for query generation and compression
        semantic_retriever: Base semantic search function
        keyword_retriever: Optional keyword search for hybrid
        enable_multi_query: Enable query variation generation
        enable_compression: Enable contextual compression

    Returns:
        Configured retriever chain
    """
    components = []

    if enable_multi_query:
        components.append(MultiQueryRetriever(llm_client))

    if keyword_retriever:
        components.append(
            HybridRetriever(
                semantic_retriever,
                keyword_retriever,
            )
        )

    if enable_compression:
        components.append(ContextualCompressor(llm_client))

    return components
