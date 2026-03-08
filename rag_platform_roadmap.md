# Enterprise Self-Hosted RAG Platform Roadmap

### With Split Dataset Model, Event Bus, Pluggable Infrastructure, and Self‑Hosted Model Management

## Summary

-   Preserve the existing organization, project, document, pipeline, and
    Qdrant-backed vector search capabilities while introducing
    `Workspace` as a first-class boundary.
-   The resource hierarchy becomes
    `Organization -> Project -> Workspace -> {KnowledgeDatasets, EvaluationDatasets}`.
-   Enforce a hard separation between retrieval data
    (`KnowledgeDataset`) and benchmark data (`EvaluationDataset`).
-   Build the platform around interface-first adapters, an internal
    event bus, and first-class LLM observability.
-   Keep Docker Compose and Helm as the supported deployment targets.
-   Default stack includes PostgreSQL, Redis, Qdrant, MinIO, Keycloak,
    Kong, Temporal, Ollama, optional vLLM, and the OpenTelemetry
    observability stack.

------------------------------------------------------------------------

# Core Architecture Principles

## 1. Dataset-Centered Knowledge Architecture

Datasets are the primary knowledge boundary in the platform.

Two dataset families exist:

### KnowledgeDataset

Used for RAG retrieval pipelines.

Structure:

KnowledgeDataset\
→ Documents\
→ Chunks\
→ Embeddings (stored in vector DB)

### EvaluationDataset

Used for benchmarking and RAG evaluation.

Structure:

EvaluationDataset\
→ EvaluationQuestions

Evaluation datasets never participate in ingestion pipelines.

------------------------------------------------------------------------

# Pluggable Infrastructure

The platform must not hardcode infrastructure providers.

Core infrastructure interfaces:

-   VectorStore
-   StorageProvider
-   EventBus
-   EmbeddingProvider
-   LLMProvider

Adapters live under:

src/backend/app/adapters/

Example supported implementations:

Vector stores - Qdrant - Pinecone - Weaviate - Milvus

Storage providers - MinIO - Amazon S3 - Google Cloud Storage - Azure
Blob Storage

Event bus - Redis Streams (default) - NATS - Kafka

Providers are selected through configuration and loaded via a provider
registry.

------------------------------------------------------------------------

# Internal Event Bus

Introduce an internal event-driven architecture.

Events include:

document_uploaded\
document_parsed\
dataset_updated\
embeddings_created\
pipeline_started\
pipeline_finished\
evaluation_completed

Event envelope fields:

event_id\
event_type\
occurred_at\
organization_id\
project_id\
workspace_id\
resource_id\
correlation_id\
causation_id\
actor_id\
payload

Use a transactional outbox pattern so events are emitted only after
database commits.

------------------------------------------------------------------------

# Ingestion Pipeline

Knowledge ingestion pipeline:

upload → MinIO\
→ Document metadata in Postgres\
→ parse\
→ chunk\
→ embed\
→ store embeddings in vector DB

Each stage publishes events and may run inside Temporal workflows or
Celery workers.

------------------------------------------------------------------------

# LLM Observability (LLMOps)

All pipelines must be instrumented with OpenTelemetry.

Captured telemetry includes:

user queries\
retrieved chunks\
prompts\
model responses\
token usage\
latency\
pipeline stage timing

Telemetry pipeline:

services → OpenTelemetry Collector →

Prometheus (metrics)\
Tempo (traces)\
Loki (logs)\
Grafana (dashboards)

Traces must link to:

PipelineRun\
EvaluationRun\
KnowledgeDataset\
EvaluationDataset

Prompt and response redaction must be configurable for enterprise
environments.

------------------------------------------------------------------------

# Self‑Hosted Model Management (ModelOps)

The platform should support managing internally hosted models even if
full implementation is deferred.

This capability enables organizations to run and operate their own
models alongside external providers.

### Model Registry

Introduce a model registry system:

Model\
ModelVersion\
ModelArtifact\
ModelDeployment

Example model metadata:

model_id\
name\
type (LLM, embedding, reranker)\
framework (PyTorch, GGUF, TensorRT, etc.)\
created_at

### Supported Model Types

-   LLM models
-   Embedding models
-   Reranker models

### Model Storage

Model artifacts may be stored in:

MinIO\
S3-compatible object storage\
local filesystem

Artifacts may include:

weights\
tokenizers\
configuration\
quantization files

### Deployment Targets

Model deployments may target:

Ollama\
vLLM\
custom inference servers\
GPU worker pools

### Model Lifecycle

draft\
registered\
validated\
deployed\
archived

### Model Observability

For self-hosted models capture:

inference latency\
throughput\
GPU utilization\
token usage\
error rates

Metrics should be integrated into the same OpenTelemetry observability
pipeline.

### Future Capabilities (Not required for v1)

Model evaluation pipelines\
automatic benchmarking\
A/B model routing\
cost-based model routing\
model performance dashboards

------------------------------------------------------------------------

# APIs

Public API remains REST for v1.

Knowledge datasets:

POST /api/v1/knowledge-datasets\
GET /api/v1/knowledge-datasets\
GET /api/v1/knowledge-datasets/{id}\
DELETE /api/v1/knowledge-datasets/{id}\
POST /api/v1/knowledge-datasets/{id}/documents

Evaluation datasets:

POST /api/v1/evaluation-datasets\
GET /api/v1/evaluation-datasets\
GET /api/v1/evaluation-datasets/{id}\
DELETE /api/v1/evaluation-datasets/{id}\
POST /api/v1/evaluation-datasets/{id}/questions

------------------------------------------------------------------------

# Core Resource Types

Workspace\
KnowledgeDataset\
Document\
Chunk\
EvaluationDataset\
EvaluationQuestion\
PipelineDefinition\
PipelineRun\
EvaluationRun\
Experiment\
Model\
ModelVersion\
ModelDeployment\
ApiKey\
UsageRecord\
AuditEvent

------------------------------------------------------------------------

# Testing Strategy

Verify:

-   tenant isolation (org / project / workspace)
-   dataset ingestion pipeline
-   evaluation pipeline isolation
-   event bus delivery and replay
-   pluggable infrastructure adapters
-   observability traces and metrics
-   model registry lifecycle

------------------------------------------------------------------------

# Assumptions

-   Workspace is the ownership boundary for datasets.
-   Default vector store is Qdrant.
-   Default storage is MinIO.
-   Redis Streams is the default event bus.
-   Ollama and vLLM are initial inference backends.
-   REST remains the public API for v1.
