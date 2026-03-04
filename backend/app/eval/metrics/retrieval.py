"""
Retrieval metrics for RAG evaluation.

Implements traditional IR metrics used to evaluate the quality of
document retrieval in RAG systems.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import math

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class RetrievalResult:
    """Result of retrieval evaluation."""

    metric_name: str
    score: float
    k: Optional[int] = None
    details: Dict[str, Any] = None

    def __post_init__(self):
        if self.details is None:
            self.details = {}


class RetrievalMetrics:
    """
    Traditional Information Retrieval metrics for RAG evaluation.

    These metrics evaluate how well the retrieval component of a RAG system
    performs at finding relevant documents.

    Metrics implemented:
    - Recall@k: Proportion of relevant documents retrieved
    - Precision@k: Proportion of retrieved documents that are relevant
    - nDCG@k: Normalized Discounted Cumulative Gain
    - MRR: Mean Reciprocal Rank
    - Hit Rate: Whether at least one relevant doc is retrieved
    - MAP: Mean Average Precision

    Example:
        metrics = RetrievalMetrics()

        # Calculate Recall@5
        result = metrics.recall_at_k(
            retrieved_doc_ids=["doc1", "doc2", "doc3"],
            relevant_doc_ids=["doc1", "doc4"],
            k=5
        )
    """

    def __init__(self):
        self.logger = logger

    def recall_at_k(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
        k: int,
    ) -> RetrievalResult:
        """
        Calculate Recall@k.

        Recall@k = |relevant retrieved| / |total relevant|

        Args:
            retrieved_doc_ids: List of retrieved document IDs (ordered by rank)
            relevant_doc_ids: List of ground truth relevant document IDs
            k: Cutoff rank

        Returns:
            RetrievalResult with score between 0 and 1
        """
        if not relevant_doc_ids:
            return RetrievalResult(
                metric_name="recall",
                score=0.0,
                k=k,
                details={"error": "no_relevant_documents"},
            )

        retrieved_k = set(retrieved_doc_ids[:k])
        relevant_set = set(relevant_doc_ids)

        relevant_retrieved = len(retrieved_k & relevant_set)
        score = relevant_retrieved / len(relevant_set)

        return RetrievalResult(
            metric_name="recall",
            score=score,
            k=k,
            details={
                "relevant_retrieved": relevant_retrieved,
                "total_relevant": len(relevant_set),
                "retrieved_count": len(retrieved_k),
            },
        )

    def precision_at_k(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
        k: int,
    ) -> RetrievalResult:
        """
        Calculate Precision@k.

        Precision@k = |relevant retrieved| / k

        Args:
            retrieved_doc_ids: List of retrieved document IDs
            relevant_doc_ids: List of ground truth relevant document IDs
            k: Cutoff rank

        Returns:
            RetrievalResult with score between 0 and 1
        """
        if k == 0:
            return RetrievalResult(
                metric_name="precision", score=0.0, k=k, details={"error": "k_is_zero"}
            )

        retrieved_k = set(retrieved_doc_ids[:k])
        relevant_set = set(relevant_doc_ids)

        relevant_retrieved = len(retrieved_k & relevant_set)
        score = relevant_retrieved / k

        return RetrievalResult(
            metric_name="precision",
            score=score,
            k=k,
            details={
                "relevant_retrieved": relevant_retrieved,
                "retrieved_count": k,
            },
        )

    def ndcg_at_k(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
        k: int,
        relevance_scores: Optional[Dict[str, float]] = None,
    ) -> RetrievalResult:
        """
        Calculate Normalized Discounted Cumulative Gain (nDCG)@k.

        nDCG measures the quality of ranking by considering the position
        of relevant documents, giving higher scores to relevant docs at top ranks.

        Args:
            retrieved_doc_ids: List of retrieved document IDs (ordered)
            relevant_doc_ids: List of ground truth relevant document IDs
            k: Cutoff rank
            relevance_scores: Optional dict mapping doc_id to relevance score

        Returns:
            RetrievalResult with score between 0 and 1
        """
        if not relevant_doc_ids:
            return RetrievalResult(
                metric_name="ndcg",
                score=0.0,
                k=k,
                details={"error": "no_relevant_documents"},
            )

        # Default relevance: 1 if relevant, 0 if not
        relevance_scores = relevance_scores or {}

        def get_relevance(doc_id: str) -> float:
            if doc_id in relevance_scores:
                return relevance_scores[doc_id]
            return 1.0 if doc_id in relevant_doc_ids else 0.0

        # Calculate DCG
        dcg = 0.0
        for i, doc_id in enumerate(retrieved_doc_ids[:k]):
            rel = get_relevance(doc_id)
            # DCG formula: rel / log2(i + 2)
            dcg += rel / math.log2(i + 2)

        # Calculate ideal DCG (IDCG)
        # Sort relevant docs by relevance and take top k
        ideal_relevances = sorted(
            [get_relevance(doc_id) for doc_id in relevant_doc_ids], reverse=True
        )[:k]

        idcg = sum(rel / math.log2(i + 2) for i, rel in enumerate(ideal_relevances))

        # nDCG = DCG / IDCG
        score = dcg / idcg if idcg > 0 else 0.0

        return RetrievalResult(
            metric_name="ndcg",
            score=score,
            k=k,
            details={
                "dcg": dcg,
                "idcg": idcg,
            },
        )

    def mrr(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
    ) -> RetrievalResult:
        """
        Calculate Mean Reciprocal Rank (MRR).

        MRR = 1 / rank_of_first_relevant
        If no relevant docs found, MRR = 0

        Args:
            retrieved_doc_ids: List of retrieved document IDs
            relevant_doc_ids: List of ground truth relevant document IDs

        Returns:
            RetrievalResult with score between 0 and 1
        """
        relevant_set = set(relevant_doc_ids)

        for i, doc_id in enumerate(retrieved_doc_ids):
            if doc_id in relevant_set:
                rank = i + 1
                score = 1.0 / rank
                return RetrievalResult(
                    metric_name="mrr",
                    score=score,
                    details={
                        "first_relevant_rank": rank,
                        "first_relevant_doc": doc_id,
                    },
                )

        return RetrievalResult(
            metric_name="mrr", score=0.0, details={"first_relevant_rank": None}
        )

    def hit_rate(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
        k: int,
    ) -> RetrievalResult:
        """
        Calculate Hit Rate@k.

        Hit rate is 1 if at least one relevant document is retrieved in top k,
        0 otherwise.

        Args:
            retrieved_doc_ids: List of retrieved document IDs
            relevant_doc_ids: List of ground truth relevant document IDs
            k: Cutoff rank

        Returns:
            RetrievalResult with score 0 or 1
        """
        retrieved_k = set(retrieved_doc_ids[:k])
        relevant_set = set(relevant_doc_ids)

        hit = len(retrieved_k & relevant_set) > 0

        return RetrievalResult(
            metric_name="hit_rate", score=1.0 if hit else 0.0, k=k, details={"hit": hit}
        )

    def map_score(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
    ) -> RetrievalResult:
        """
        Calculate Mean Average Precision (MAP).

        MAP is the mean of average precision scores for each query.
        Average precision = average of precision@k for each k where a relevant doc is retrieved.

        Args:
            retrieved_doc_ids: List of retrieved document IDs
            relevant_doc_ids: List of ground truth relevant document IDs

        Returns:
            RetrievalResult with score between 0 and 1
        """
        if not relevant_doc_ids:
            return RetrievalResult(
                metric_name="map", score=0.0, details={"error": "no_relevant_documents"}
            )

        relevant_set = set(relevant_doc_ids)
        precisions = []
        relevant_count = 0

        for i, doc_id in enumerate(retrieved_doc_ids):
            if doc_id in relevant_set:
                relevant_count += 1
                precision_at_i = relevant_count / (i + 1)
                precisions.append(precision_at_i)

        score = sum(precisions) / len(relevant_set) if relevant_set else 0.0

        return RetrievalResult(
            metric_name="map",
            score=score,
            details={
                "average_precisions": precisions,
                "relevant_found": relevant_count,
            },
        )

    def compute_all(
        self,
        retrieved_doc_ids: List[str],
        relevant_doc_ids: List[str],
        k_values: List[int] = None,
    ) -> Dict[str, RetrievalResult]:
        """
        Compute all retrieval metrics at once.

        Args:
            retrieved_doc_ids: List of retrieved document IDs
            relevant_doc_ids: List of ground truth relevant document IDs
            k_values: List of k values to compute metrics for (default: [1, 5, 10])

        Returns:
            Dictionary mapping metric names to RetrievalResults
        """
        if k_values is None:
            k_values = [1, 5, 10]

        results = {}

        # Compute metrics at different k values
        for k in k_values:
            results[f"recall@{k}"] = self.recall_at_k(
                retrieved_doc_ids, relevant_doc_ids, k
            )
            results[f"precision@{k}"] = self.precision_at_k(
                retrieved_doc_ids, relevant_doc_ids, k
            )
            results[f"ndcg@{k}"] = self.ndcg_at_k(
                retrieved_doc_ids, relevant_doc_ids, k
            )
            results[f"hit_rate@{k}"] = self.hit_rate(
                retrieved_doc_ids, relevant_doc_ids, k
            )

        # Compute non-k metrics
        results["mrr"] = self.mrr(retrieved_doc_ids, relevant_doc_ids)
        results["map"] = self.map_score(retrieved_doc_ids, relevant_doc_ids)

        return results

    @staticmethod
    def aggregate_results(
        results_list: List[Dict[str, RetrievalResult]],
    ) -> Dict[str, Dict[str, float]]:
        """
        Aggregate results across multiple queries.

        Args:
            results_list: List of result dictionaries from compute_all()

        Returns:
            Dictionary with mean, std, min, max for each metric
        """
        if not results_list:
            return {}

        # Collect scores for each metric
        metric_scores: Dict[str, List[float]] = {}
        for results in results_list:
            for metric_name, result in results.items():
                if metric_name not in metric_scores:
                    metric_scores[metric_name] = []
                metric_scores[metric_name].append(result.score)

        # Compute statistics
        aggregated = {}
        for metric_name, scores in metric_scores.items():
            n = len(scores)
            mean = sum(scores) / n
            variance = sum((x - mean) ** 2 for x in scores) / n
            std = variance**0.5

            aggregated[metric_name] = {
                "mean": mean,
                "std": std,
                "min": min(scores),
                "max": max(scores),
                "count": n,
            }

        return aggregated
