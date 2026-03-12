# Qdrant Hybrid Search Documentation – Comprehensive Overview

**Qdrant** is an open-source vector database (written in Rust) optimized for fast, scalable semantic search. Since version **1.10** (2024), it features a powerful **Query API** that enables **server-side hybrid search**, combining multiple retrieval signals (dense vectors, sparse vectors, late-interaction models) without client-side post-processing.

Hybrid search improves relevance by merging semantic (dense) and keyword/exact-match (sparse) signals, often outperforming single-method retrieval. The article and docs focus on **Reciprocal Rank Fusion (RRF)** as the primary fusion method, multistage pipelines, reranking with late-interaction models (e.g., ColBERT), and efficient configurations.

**Author (Article)**: Kacper Łukawski  
**Publication Date**: July 25, 2024  
**Official Docs**: https://qdrant.tech/documentation/concepts/hybrid-queries/ (Query API reference)

## 1. Key Concepts

| Concept                  | Description                                                                 | Use Case / Benefit                          |
|--------------------------|-----------------------------------------------------------------------------|---------------------------------------------|
| **Hybrid Search**        | Combines results from multiple query types (dense + sparse + multivector)   | Better precision/recall than single method  |
| **Dense Vectors**        | Semantic embeddings (e.g., float32, uint8 quantized, Matryoshka)            | Captures meaning/synonyms                   |
| **Sparse Vectors**       | High-dimensional, mostly-zero vectors (e.g., SPLADE, BM25-like)             | Exact term matching, keyword boosts         |
| **Late-Interaction (Multivector)** | Token-level embeddings (e.g., ColBERT); score via max-sim interactions | Fine-grained relevance without cross-encoder cost |
| **Reciprocal Rank Fusion (RRF)** | Rank-based fusion: score = Σ 1/(rank + k) across queries                   | No score normalization needed; robust       |
| **Reranking**            | Apply expensive model (e.g., ColBERT) only on top-k candidates from prefetch | High accuracy + efficiency                  |
| **Prefetch**             | Nested sub-queries executed first; results feed into main query/fusion     | Multistage retrieval (coarse → fine)        |
| **Matryoshka Embeddings**| Progressive dimensions (e.g., 64 → 128 → 256 → full)                      | Fast initial fetch + refined ranking        |
| **Named Vectors**        | Multiple vector spaces per point (e.g., "dense", "sparse", "colbert")      | Mix models in one collection                |

## 2. Why Hybrid Search?

- **Complementary Strengths** — Dense handles semantics; sparse handles exact phrases, typos, rare terms.
- **Robustness** — Mitigates failures (e.g., semantic drift, keyword mismatch).
- **Efficiency** — Prefetch with cheap/fast vectors → rerank with expensive ones.
- **Server-Side** — No manual merging; Qdrant handles fusion/reranking internally.
- **Benchmark Gains** — Often 10–30% better NDCG/MAP vs pure dense/sparse.

## 3. How Qdrant Implements Hybrid Search (Query API)

Introduced in v1.10. Use `/points/query` endpoint (not legacy `/search`).

Core building blocks:
- **prefetch**: Array of sub-queries (can nest).
- **query**: Main operation — either vector query, fusion (RRF), or late-interaction rerank.
- **using**: Named vector to query.
- **limit**: Candidates per stage.

### Supported Fusion Methods

| Method | Description | Parameters | Notes |
|--------|-------------|------------|-------|
| **RRF** | Reciprocal Rank Fusion (default k=60 in practice, but API default k=2) | `k`, `weights` (per prefetch) | Rank-based; ignores score scale; most common |
| **DBSF** | Distribution-Based Score Fusion | (mean ± 3σ normalization + sum) | Score-based alternative |

RRF formula (simplified):
score(d) = Σ_q 1 / (rank_q(d) + k)
textHigher score → better rank.

## 4. Code Examples (Python Client)

Install: `pip install qdrant-client`

### Initialize Client
```python
from qdrant_client import QdrantClient, models

client = QdrantClient("http://localhost:6333")  # or cloud URL
Basic Hybrid: Dense + Sparse with RRF
Pythonresponse = client.query_points(
    collection_name="my-collection",
    prefetch=[
        models.Prefetch(
            query=[0.1, 0.2, ..., 0.9],          # dense vector
            using="dense",
            limit=20,
        ),
        models.Prefetch(
            query=models.SparseVector(
                indices=[125, 9325, 58214],
                values=[0.731, 0.229, -0.164],
            ),
            using="sparse",
            limit=20,
        ),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),  # or models.RrfQuery(rrf=models.Rrf(k=60, weights=[1.0, 2.0]))
    limit=10,
)
Multistage: Matryoshka Refinement
Pythonmatryoshka_prefetch = models.Prefetch(
    prefetch=[
        models.Prefetch(
            prefetch=[
                models.Prefetch(
                    query=[...],  # 64-dim
                    using="matryoshka-64",
                    limit=100,
                )
            ],
            query=[...],      # 128-dim
            using="matryoshka-128",
            limit=50,
        )
    ],
    query=[...],              # 256-dim
    using="matryoshka-256",
    limit=25,
)
Hybrid + Late-Interaction Reranking (ColBERT-style)
Pythonresponse = client.query_points(
    collection_name="my-collection",
    prefetch=[
        # sparse + dense RRF branch
        models.Prefetch(
            prefetch=[...],  # as above
            query=models.FusionQuery(fusion=models.Fusion.RRF),
        ),
        # Matryoshka branch
        matryoshka_prefetch,
    ],
    query=[  # multivector query (list of token vectors)
        [0.17, 0.23, ...],
        [0.22, 0.11, ...],
        # ...
    ],
    using="colbert",
    limit=10,
)
Only prefetch candidates (~50–100) are reranked → very efficient.
5. Collection Configuration for Hybrid
Create with multiple named vectors; disable HNSW for reranking-only vectors.
Pythonclient.create_collection(
    collection_name="hybrid-collection",
    vectors_config={
        "dense": models.VectorParams(size=768, distance=models.Distance.COSINE),
        "matryoshka-256": models.VectorParams(size=256, distance=models.Distance.COSINE),
        "colbert": models.VectorParams(
            size=128,
            distance=models.Distance.COSINE,
            multivector_config=models.MultiVectorConfig(comparator=models.MultiVectorComparator.MAX_SIM),
            hnsw_config=models.HnswConfigDiff(m=0),  # disable HNSW for rerank-only
        ),
    },
    sparse_vectors_config={
        "sparse": models.SparseVectorParams()
    }
)
6. Performance & Best Practices

Prefetch first with cheap vectors (low-dim, uint8 quantized, sparse) → limit=50–200.
Rerank only top candidates with late-interaction (ColBERT) → no full scan.
Disable HNSW on multivector/rerank-only configs to save memory/index time.
Use weights in RRF when one signal is stronger (e.g., sparse weight 2.0 for keyword-heavy domains).
Evaluate data-driven — test RRF vs DBSF, different k, prefetch limits.
Storage Trade-off — Multivectors (ColBERT) store 100s of vectors per doc → use for reranking only.

7. When to Use Hybrid vs Alternatives

Pure Dense → Good for general semantic search.
Pure Sparse/BM25 → Keyword-heavy, exact matches (legal, product search).
Hybrid (RRF) → Most real-world RAG; balances semantics + keywords.
Hybrid + Rerank → Highest quality (legal, medical, enterprise search).
Multistage/Matryoshka → Latency-critical + high accuracy.