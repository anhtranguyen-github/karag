"""
Generation metrics for RAG evaluation.

Implements RAGAS-style metrics for evaluating answer quality,
faithfulness, and relevance in RAG systems.
"""

import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class GenerationResult:
    """Result of generation evaluation."""

    metric_name: str
    score: float
    details: dict[str, Any] = None

    def __post_init__(self):
        if self.details is None:
            self.details = {}


class GenerationMetrics:
    """
    Generation and faithfulness metrics for RAG evaluation.

    These metrics evaluate the quality of generated answers in a RAG system:
    - Faithfulness: Is the answer grounded in retrieved context?
    - Answer Relevancy: Does the answer address the query?
    - Context Precision: How focused are retrieved chunks?
    - Context Recall: How much of ground truth is covered?
    - Answer Similarity: Semantic similarity to reference answer
    - Exact Match / F1: Token-level matching

    Example:
        metrics = GenerationMetrics()

        result = metrics.faithfulness(
            answer="The sky is blue due to Rayleigh scattering.",
            contexts=["Rayleigh scattering causes the sky to appear blue."]
        )
    """

    def __init__(self, llm_client=None):
        """
        Initialize generation metrics.

        Args:
            llm_client: Optional LLM client for LLM-based metrics
        """
        self.llm_client = llm_client
        self.logger = logger
        self._nltk_available = self._check_nltk()

    def _check_nltk(self) -> bool:
        """Check if NLTK is available for tokenization."""
        try:
            import nltk  # noqa: F401

            return True
        except ImportError:
            return False

    def _tokenize(self, text: str) -> list[str]:
        """Simple tokenization fallback."""
        if self._nltk_available:
            try:
                import nltk

                return nltk.word_tokenize(text.lower())
            except Exception:  # noqa: S110
                pass
        # Fallback to simple whitespace tokenization
        return text.lower().split()

    def exact_match(
        self,
        prediction: str,
        reference: str,
        normalize: bool = True,
    ) -> GenerationResult:
        """
        Calculate exact match score.

        Args:
            prediction: Predicted answer
            reference: Reference/ground truth answer
            normalize: Whether to normalize text (lowercase, strip)

        Returns:
            GenerationResult with score 0 or 1
        """
        if normalize:
            pred = prediction.lower().strip()
            ref = reference.lower().strip()
        else:
            pred = prediction.strip()
            ref = reference.strip()

        score = 1.0 if pred == ref else 0.0

        return GenerationResult(
            metric_name="exact_match",
            score=score,
            details={
                "prediction": prediction[:100],
                "reference": reference[:100],
                "normalized": normalize,
            },
        )

    def f1_score(
        self,
        prediction: str,
        reference: str,
    ) -> GenerationResult:
        """
        Calculate token-level F1 score.

        Args:
            prediction: Predicted answer
            reference: Reference/ground truth answer

        Returns:
            GenerationResult with F1 score between 0 and 1
        """
        pred_tokens = self._tokenize(prediction)
        ref_tokens = self._tokenize(reference)

        if not pred_tokens and not ref_tokens:
            return GenerationResult(metric_name="f1", score=1.0, details={"note": "both_empty"})

        if not pred_tokens or not ref_tokens:
            return GenerationResult(
                metric_name="f1",
                score=0.0,
                details={
                    "prediction_tokens": len(pred_tokens),
                    "reference_tokens": len(ref_tokens),
                },
            )

        # Calculate overlap
        pred_counter = Counter(pred_tokens)
        ref_counter = Counter(ref_tokens)

        overlap = sum((pred_counter & ref_counter).values())

        precision = overlap / len(pred_tokens) if pred_tokens else 0
        recall = overlap / len(ref_tokens) if ref_tokens else 0

        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

        return GenerationResult(
            metric_name="f1",
            score=f1,
            details={
                "precision": precision,
                "recall": recall,
                "overlap": overlap,
            },
        )

    def faithfulness(
        self,
        answer: str,
        contexts: list[str],
        method: str = "claim_verification",
    ) -> GenerationResult:
        """
        Calculate faithfulness score.

        Faithfulness measures whether the answer can be inferred from
        the retrieved contexts. Higher score = more faithful.

        Args:
            answer: Generated answer
            contexts: Retrieved contexts
            method: Method to use ("claim_verification", "entailment", "llm")

        Returns:
            GenerationResult with faithfulness score
        """
        if not contexts:
            return GenerationResult(metric_name="faithfulness", score=0.0, details={"error": "no_contexts"})

        if method == "claim_verification":
            return self._faithfulness_claim_verification(answer, contexts)
        elif method == "entailment":
            return self._faithfulness_entailment(answer, contexts)
        elif method == "llm" and self.llm_client:
            return self._faithfulness_llm(answer, contexts)
        else:
            # Default to simple overlap
            return self._faithfulness_overlap(answer, contexts)

    def _faithfulness_claim_verification(
        self,
        answer: str,
        contexts: list[str],
    ) -> GenerationResult:
        """
        Simple claim verification based on n-gram overlap.

        Extracts noun phrases and key terms from answer and checks
        if they appear in contexts.
        """
        # Simple extraction of key terms (noun phrases, numbers, named entities)
        context_text = " ".join(contexts).lower()
        _ = answer.lower()  # Reserved for future use

        # Extract potential claims (sentences)
        sentences = re.split(r"[.!?]+", answer)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]

        if not sentences:
            return GenerationResult(
                metric_name="faithfulness",
                score=1.0,
                details={"note": "no_sentences_to_verify"},
            )

        verified_count = 0
        sentence_results = []

        for sentence in sentences:
            # Simple verification: check if key terms from sentence appear in context
            terms = self._extract_key_terms(sentence)
            verified_terms = [t for t in terms if t in context_text]

            # Sentence is verified if majority of terms are in context
            if terms:
                sentence_score = len(verified_terms) / len(terms)
                if sentence_score >= 0.5:
                    verified_count += 1
                sentence_results.append(
                    {
                        "sentence": sentence[:100],
                        "terms": terms[:10],
                        "verified_terms": verified_terms[:10],
                        "score": sentence_score,
                    }
                )

        score = verified_count / len(sentences) if sentences else 1.0

        return GenerationResult(
            metric_name="faithfulness",
            score=score,
            details={
                "method": "claim_verification",
                "verified_sentences": verified_count,
                "total_sentences": len(sentences),
                "sentence_results": sentence_results[:5],
            },
        )

    def _faithfulness_entailment(
        self,
        answer: str,
        contexts: list[str],
    ) -> GenerationResult:
        """Placeholder for entailment-based faithfulness (requires NLI model)."""
        # This would use an NLI model in a full implementation
        return self._faithfulness_overlap(answer, contexts)

    def _faithfulness_llm(
        self,
        answer: str,
        contexts: list[str],
    ) -> GenerationResult:
        """LLM-based faithfulness evaluation."""
        # Would use LLM to verify each claim
        # For now, fall back to overlap
        return self._faithfulness_overlap(answer, contexts)

    def _faithfulness_overlap(
        self,
        answer: str,
        contexts: list[str],
    ) -> GenerationResult:
        """Simple token overlap-based faithfulness."""
        answer_tokens = set(self._tokenize(answer))
        context_tokens = set()
        for ctx in contexts:
            context_tokens.update(self._tokenize(ctx))

        if not answer_tokens:
            return GenerationResult(metric_name="faithfulness", score=1.0, details={"note": "empty_answer"})

        overlap = len(answer_tokens & context_tokens)
        score = overlap / len(answer_tokens)

        return GenerationResult(
            metric_name="faithfulness",
            score=score,
            details={
                "method": "token_overlap",
                "overlap": overlap,
                "answer_tokens": len(answer_tokens),
            },
        )

    def answer_relevancy(
        self,
        query: str,
        answer: str,
        contexts: list[str] | None = None,
    ) -> GenerationResult:
        """
        Calculate answer relevancy.

        Measures how well the answer addresses the query.
        Higher score = more relevant.

        Args:
            query: User query
            answer: Generated answer
            contexts: Optional contexts for additional checking

        Returns:
            GenerationResult with relevancy score
        """
        query_tokens = set(self._tokenize(query))
        answer_tokens = set(self._tokenize(answer))

        if not query_tokens or not answer_tokens:
            return GenerationResult(
                metric_name="answer_relevancy",
                score=0.0 if query_tokens else 1.0,
                details={"note": "empty_query_or_answer"},
            )

        # Calculate token overlap
        overlap = len(query_tokens & answer_tokens)

        # Jaccard similarity with length penalty
        jaccard = overlap / len(query_tokens | answer_tokens)

        # Query coverage: what fraction of query terms appear in answer
        coverage = overlap / len(query_tokens) if query_tokens else 0

        # Combined score
        score = (jaccard + coverage) / 2

        return GenerationResult(
            metric_name="answer_relevancy",
            score=score,
            details={
                "jaccard": jaccard,
                "coverage": coverage,
                "query_terms": len(query_tokens),
                "answer_terms": len(answer_tokens),
            },
        )

    def context_precision(
        self,
        contexts: list[str],
        query: str | None = None,
    ) -> GenerationResult:
        """
        Calculate context precision.

        Measures the signal-to-noise ratio in retrieved contexts.
        Higher score = less noise in contexts.

        Args:
            contexts: Retrieved contexts
            query: Optional query for relevance checking

        Returns:
            GenerationResult with precision score
        """
        if not contexts:
            return GenerationResult(
                metric_name="context_precision",
                score=0.0,
                details={"note": "no_contexts"},
            )

        if len(contexts) == 1:
            return GenerationResult(
                metric_name="context_precision",
                score=1.0,
                details={"note": "single_context"},
            )

        # Measure uniqueness of contexts (less redundancy = higher precision)
        context_tokens = [set(self._tokenize(ctx)) for ctx in contexts]

        total_unique = set()
        redundancies = []

        for i, tokens in enumerate(context_tokens):
            # Check overlap with previous contexts
            prev_tokens = set()
            for prev in context_tokens[:i]:
                prev_tokens.update(prev)

            new_tokens = tokens - prev_tokens
            redundancy = 1 - (len(new_tokens) / len(tokens)) if tokens else 0
            redundancies.append(redundancy)
            total_unique.update(new_tokens)

        # Precision = 1 - average redundancy
        avg_redundancy = sum(redundancies) / len(redundancies) if redundancies else 0
        score = max(0, 1 - avg_redundancy)

        return GenerationResult(
            metric_name="context_precision",
            score=score,
            details={
                "avg_redundancy": avg_redundancy,
                "context_count": len(contexts),
                "unique_tokens": len(total_unique),
            },
        )

    def context_recall(
        self,
        contexts: list[str],
        ground_truth_answer: str,
    ) -> GenerationResult:
        """
        Calculate context recall.

        Measures how much of the ground truth information is covered
        by the retrieved contexts.

        Args:
            contexts: Retrieved contexts
            ground_truth_answer: Ground truth/reference answer

        Returns:
            GenerationResult with recall score
        """
        if not contexts or not ground_truth_answer:
            return GenerationResult(
                metric_name="context_recall",
                score=0.0,
                details={"note": "missing_contexts_or_answer"},
            )

        context_text = " ".join(contexts).lower()
        gt_tokens = set(self._tokenize(ground_truth_answer))

        if not gt_tokens:
            return GenerationResult(
                metric_name="context_recall",
                score=1.0,
                details={"note": "empty_ground_truth"},
            )

        # Check how many key terms from ground truth appear in contexts
        found_tokens = [t for t in gt_tokens if t in context_text]
        score = len(found_tokens) / len(gt_tokens)

        return GenerationResult(
            metric_name="context_recall",
            score=score,
            details={
                "ground_truth_tokens": len(gt_tokens),
                "found_tokens": len(found_tokens),
                "coverage": score,
            },
        )

    def answer_similarity(
        self,
        prediction: str,
        reference: str,
        method: str = "rouge_l",
    ) -> GenerationResult:
        """
        Calculate semantic similarity between predicted and reference answers.

        Args:
            prediction: Predicted answer
            reference: Reference answer
            method: Similarity method ("rouge_l", "bertscore", "cosine")

        Returns:
            GenerationResult with similarity score
        """
        if method == "rouge_l":
            return self._rouge_l(prediction, reference)
        elif method == "bertscore":
            return self._bertscore(prediction, reference)
        else:
            # Fallback to F1
            result = self.f1_score(prediction, reference)
            result.metric_name = "answer_similarity"
            result.details["method"] = "f1"
            return result

    def _rouge_l(
        self,
        prediction: str,
        reference: str,
    ) -> GenerationResult:
        """Calculate ROUGE-L score (longest common subsequence)."""
        pred_tokens = self._tokenize(prediction)
        ref_tokens = self._tokenize(reference)

        # Calculate LCS
        lcs_length = self._lcs_length(pred_tokens, ref_tokens)

        if not pred_tokens or not ref_tokens:
            precision = recall = f1 = 0.0
        else:
            precision = lcs_length / len(pred_tokens)
            recall = lcs_length / len(ref_tokens)
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return GenerationResult(
            metric_name="answer_similarity",
            score=f1,
            details={
                "method": "rouge_l",
                "precision": precision,
                "recall": recall,
                "lcs_length": lcs_length,
            },
        )

    def _lcs_length(self, seq1: list[str], seq2: list[str]) -> int:
        """Calculate length of longest common subsequence."""
        m, n = len(seq1), len(seq2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if seq1[i - 1] == seq2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

        return dp[m][n]

    def _bertscore(
        self,
        prediction: str,
        reference: str,
    ) -> GenerationResult:
        """Placeholder for BERTScore (requires bert-score library)."""
        # Would use bert-score library in full implementation
        # For now, fall back to ROUGE-L
        result = self._rouge_l(prediction, reference)
        result.details["method"] = "bertscore_placeholder"
        result.details["note"] = "install_bert_score_for_better_similarity"
        return result

    def _extract_key_terms(self, text: str) -> list[str]:
        """Extract key terms from text for verification."""
        # Simple extraction: numbers, capitalized words, quoted terms
        terms = []

        # Numbers
        terms.extend(re.findall(r"\d+(?:\.\d+)?", text))

        # Capitalized words (potential named entities)
        terms.extend(re.findall(r"\b[A-Z][a-zA-Z]*\b", text))

        # Quoted terms
        terms.extend(re.findall(r'"([^"]*)"', text))

        return [t.lower() for t in terms if len(t) > 2]

    def compute_all(
        self,
        query: str,
        answer: str,
        contexts: list[str],
        reference_answer: str | None = None,
    ) -> dict[str, GenerationResult]:
        """
        Compute all generation metrics at once.

        Args:
            query: User query
            answer: Generated answer
            contexts: Retrieved contexts
            reference_answer: Optional ground truth answer

        Returns:
            Dictionary mapping metric names to GenerationResults
        """
        results = {}

        # Faithfulness
        results["faithfulness"] = self.faithfulness(answer, contexts)

        # Answer Relevancy
        results["answer_relevancy"] = self.answer_relevancy(query, answer, contexts)

        # Context metrics
        results["context_precision"] = self.context_precision(contexts, query)

        if reference_answer:
            results["context_recall"] = self.context_recall(contexts, reference_answer)
            results["exact_match"] = self.exact_match(answer, reference_answer)
            results["f1"] = self.f1_score(answer, reference_answer)
            results["answer_similarity"] = self.answer_similarity(answer, reference_answer)

        return results

    @staticmethod
    def aggregate_results(
        results_list: list[dict[str, GenerationResult]],
    ) -> dict[str, dict[str, float]]:
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
        metric_scores: dict[str, list[float]] = {}
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
