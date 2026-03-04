"""
Dataset definitions and registration for RAG evaluation.

This module registers all supported datasets with the dataset registry.
"""

from backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader
from backend.app.eval.datasets.base import DatasetInfo
from backend.app.eval.datasets.registry import dataset_registry


def register_all_datasets():
    """Register all supported datasets with the registry."""
    
    # English Datasets
    
    # MS MARCO
    dataset_registry.register(
        "ms_marco",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="ms_marco",
            description="Large-scale web search benchmark",
            language="en",
            task_type="retrieval",
            num_samples=100000,
            domains=["web", "search"],
            citation="Bajaj et al., 2016",
        )
    )
    
    # SQuAD 2.0
    dataset_registry.register(
        "squad_v2",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="squad_v2",
            description="Reading comprehension with unanswerable questions",
            language="en",
            task_type="qa",
            num_samples=150000,
            domains=["wiki", "reading_comprehension"],
            citation="Rajpurkar et al., 2018",
        )
    )
    
    # HotpotQA
    dataset_registry.register(
        "hotpot_qa",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="hotpot_qa",
            description="Multi-hop reasoning QA dataset",
            language="en",
            task_type="qa",
            num_samples=90000,
            domains=["wiki", "multi_hop"],
            citation="Yang et al., 2018",
        )
    )
    
    # Natural Questions
    dataset_registry.register(
        "natural_questions",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="natural_questions",
            description="Google search queries with answers",
            language="en",
            task_type="qa",
            num_samples=300000,
            domains=["search", "real_queries"],
            citation="Kwiatkowski et al., 2019",
        )
    )
    
    # TriviaQA
    dataset_registry.register(
        "trivia_qa",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="trivia_qa",
            description="Trivia question answering",
            language="en",
            task_type="qa",
            num_samples=650000,
            domains=["trivia", "general"],
            citation="Joshi et al., 2017",
        )
    )
    
    # Vietnamese Datasets
    
    # UIT-ViQuAD
    dataset_registry.register(
        "uit_viquad",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="uit_viquad",
            description="23,000+ QA pairs from Vietnamese Wikipedia",
            language="vi",
            task_type="qa",
            num_samples=23000,
            domains=["wiki", "vietnamese"],
            citation="Nguyen et al., 2020",
        )
    )
    
    # UIT-ViNewsQA
    dataset_registry.register(
        "uit_vinewsqa",
        HuggingFaceDatasetLoader,
        DatasetInfo(
            name="uit_vinewsqa",
            description="22,077 medical news QA pairs",
            language="vi",
            task_type="qa",
            num_samples=22077,
            domains=["medical", "vietnamese", "news"],
            citation="UIT NLP Group",
        )
    )


# Auto-register on import
register_all_datasets()