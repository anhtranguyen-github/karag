# Ingestion Trace: Transformer Foundation (Attention Is All You Need)

**Source:** 1906.05799v4.pdf
**Total Latency:** 98089.16ms
**Final Collection:** `obs_coll_1774259892`

## Component Breakdown

### Reading: Reader Manager
- **Class:** `ReaderManager`
- **Outcome:** {'chars': 121712}
- **Latency:** 623.99ms

  - **Meta:** `{'reader': 'simple_pdf'}`
### Chunking: Chunker Manager
- **Class:** `ChunkerManager`
- **Outcome:** {'num_chunks': 2023}
- **Latency:** 15319.18ms

  - **Meta:** `{'component': 'semantic'}`
### Embedding: Embedder Manager
- **Class:** `EmbedderManager`
- **Outcome:** Success
- **Latency:** 30178.95ms

  - **Meta:** `{'model': 'jina-embeddings-v3'}`
### Persistence: VectorStore Manager
- **Class:** `VectorStoreManager`
- **Outcome:** Success
- **Latency:** 51966.69ms

  - **Meta:** `{'store': 'qdrant'}`
