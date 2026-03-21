import { z } from "zod";

import type { ConfigFormDefinition } from "@/components/config/types";

const organizationFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional()
});

export const organizationFormDefinition: ConfigFormDefinition<typeof organizationFormSchema> = {
  schema: organizationFormSchema,
  defaultValues: {
    name: "",
    description: ""
  },
  fields: [
    { name: "name", label: "Organization name", placeholder: "Acme", required: true },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "Optional context for this organization"
    }
  ],
  submitLabel: "Create organization"
};

const projectFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional()
});

export const projectFormDefinition: ConfigFormDefinition<typeof projectFormSchema> = {
  schema: projectFormSchema,
  defaultValues: {
    name: "",
    description: ""
  },
  fields: [
    { name: "name", label: "Project name", placeholder: "RAG Platform", required: true },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "Optional project summary"
    }
  ],
  submitLabel: "Create project"
};

const workspaceFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional()
});

export const workspaceFormDefinition: ConfigFormDefinition<typeof workspaceFormSchema> = {
  schema: workspaceFormSchema,
  defaultValues: {
    name: "",
    description: ""
  },
  fields: [
    { name: "name", label: "Workspace name", placeholder: "Production", required: true },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "Explain what this workspace operates"
    }
  ],
  submitLabel: "Create workspace"
};

const evaluationDatasetFormSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional()
});

export const evaluationDatasetFormDefinition: ConfigFormDefinition<typeof evaluationDatasetFormSchema> = {
  schema: evaluationDatasetFormSchema,
  defaultValues: {
    workspace_id: "",
    name: "",
    description: ""
  },
  fields: [
    { name: "name", label: "Evaluation dataset", placeholder: "Regression benchmark" },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "What scenarios should this benchmark cover?"
    }
  ],
  submitLabel: "Create evaluation dataset"
};

const evaluationQuestionFormSchema = z.object({
  question: z.string().min(5),
  expected_answer: z.string().min(3),
  expected_context: z.string().optional()
});

export const evaluationQuestionFormDefinition: ConfigFormDefinition<typeof evaluationQuestionFormSchema> = {
  schema: evaluationQuestionFormSchema,
  defaultValues: {
    question: "",
    expected_answer: "",
    expected_context: ""
  },
  fields: [
    {
      name: "question",
      label: "Question",
      component: "textarea",
      placeholder: "What should the assistant answer?"
    },
    {
      name: "expected_answer",
      label: "Expected answer",
      component: "textarea",
      placeholder: "What answer should score as correct?"
    },
    {
      name: "expected_context",
      label: "Expected context",
      component: "textarea",
      placeholder: "Optional context slice that should be retrieved"
    }
  ],
  submitLabel: "Add question"
};


const workspaceRagRetrievalFormSchema = z.object({
  top_k: z.number().min(1).max(20),
  score_threshold: z.number().min(0).max(1),
  hybrid_search: z.boolean(),
  reranker_model: z.string().min(1),
  chunk_size: z.number().min(64).max(4096),
  chunk_overlap: z.number().min(0).max(1024)
});

export const workspaceRagRetrievalFormDefinition: ConfigFormDefinition<typeof workspaceRagRetrievalFormSchema> = {
  schema: workspaceRagRetrievalFormSchema,
  defaultValues: {
    top_k: 3,
    score_threshold: 0,
    hybrid_search: true,
    reranker_model: "cross-encoder-mini",
    chunk_size: 512,
    chunk_overlap: 64
  },
  fields: [
    { name: "top_k", label: "Top K", component: "number", min: 1, max: 20 },
    { name: "score_threshold", label: "Score threshold", component: "slider", min: 0, max: 1, step: 0.01 },
    { name: "hybrid_search", label: "Hybrid search", component: "switch" },
    {
      name: "reranker_model",
      label: "Reranker model",
      component: "select",
      options: [
        { label: "Disabled", value: "none" },
        { label: "BGE Reranker v2", value: "bge-reranker-v2-m3" },
        { label: "Cross Encoder Small", value: "cross-encoder-mini" },
        { label: "Cohere Rerank", value: "cohere-rerank" }
      ]
    },
    { name: "chunk_size", label: "Chunk size", component: "slider", min: 64, max: 2048, step: 64 },
    { name: "chunk_overlap", label: "Chunk overlap", component: "number", min: 0, max: 1024 }
  ],
  submitLabel: "Save retrieval"
};

const workspaceRagEmbeddingFormSchema = z.object({
  embedding_provider: z.string().min(1),
  embedding_model: z.string().min(1),
  embedding_dimension: z.number().nullable().optional(),
  embedding_batch_size: z.number().min(1).max(512),
  api_key: z.string().optional()
});

export const workspaceRagEmbeddingFormDefinition: ConfigFormDefinition<typeof workspaceRagEmbeddingFormSchema> = {
  schema: workspaceRagEmbeddingFormSchema,
  defaultValues: {
    embedding_provider: "jina",
    embedding_model: "jina-embeddings-v3",
    embedding_dimension: 1024,
    embedding_batch_size: 16
  },
  fields: [
    {
      name: "embedding_provider",
      label: "Embedding provider",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Jina", value: "jina" },
        { label: "vLLM", value: "vllm" }
      ]
    },
    {
      name: "embedding_model",
      label: "Embedding model",
      component: "select",
      options: [
        { label: "jina-embeddings-v3", value: "jina-embeddings-v3" },
        { label: "text-embedding-3-small", value: "text-embedding-3-small" },
        { label: "text-embedding-3-large", value: "text-embedding-3-large" },
        { label: "nomic-embed-text", value: "nomic-embed-text" },
        { label: "bge-m3", value: "bge-m3" }
      ]
    },
    { name: "embedding_dimension", label: "Embedding dimension", component: "number", min: 0, max: 8192, placeholder: "Auto-detect" },
    { name: "embedding_batch_size", label: "Batch size", component: "slider", min: 1, max: 128, step: 1 },
    { name: "api_key", label: "API Key (Secret)", component: "secret", placeholder: "User encrypted key" }
  ],
  submitLabel: "Save embedding"
};

const workspaceRagVectorStoreFormSchema = z.object({
  vector_store_type: z.string().min(1),
  url: z.string().optional(),
  api_key: z.string().optional(),
  collection_name: z.string().optional(),
  distance_metric: z.string().min(1),
  index_type: z.string().min(1)
});

export const workspaceRagVectorStoreFormDefinition: ConfigFormDefinition<typeof workspaceRagVectorStoreFormSchema> = {
  schema: workspaceRagVectorStoreFormSchema,
  defaultValues: {
    vector_store_type: "pgvector",
    url: "",
    api_key: "",
    collection_name: "",
    distance_metric: "cosine",
    index_type: "hnsw"
  },
  fields: [
    {
      name: "vector_store_type",
      label: "Vector store",
      component: "select",
      options: [
        { label: "pgvector", value: "pgvector" },
        { label: "Qdrant", value: "qdrant" },
        { label: "Weaviate", value: "weaviate" },
        { label: "Milvus", value: "milvus" },
        { label: "Redis", value: "redis" }
      ]
    },
    {
      name: "url",
      label: "Endpoint URL",
      placeholder: "http://qdrant:6333"
    },
    {
      name: "api_key",
      label: "API Key / Secret",
      component: "secret",
      placeholder: "Optional for local dev"
    },
    { name: "collection_name", label: "Collection", placeholder: "knowledge_chunks__text_embedding_3_small" },
    {
      name: "distance_metric",
      label: "Distance metric",
      component: "select",
      options: [
        { label: "Cosine", value: "cosine" },
        { label: "Dot", value: "dot" },
        { label: "L2", value: "l2" }
      ]
    },
    {
      name: "index_type",
      label: "Index type",
      component: "select",
      options: [
        { label: "HNSW", value: "hnsw" },
        { label: "Flat", value: "flat" },
        { label: "IVF-Flat", value: "ivf_flat" }
      ]
    }
  ],
  submitLabel: "Save vector store"
};

const workspaceRagReadingFormSchema = z.object({
  max_context_tokens: z.number().min(128).max(64000),
  context_compression: z.boolean(),
  citation_mode: z.string().min(1),
  context_formatting_template: z.string().min(3)
});

export const workspaceRagReadingFormDefinition: ConfigFormDefinition<typeof workspaceRagReadingFormSchema> = {
  schema: workspaceRagReadingFormSchema,
  defaultValues: {
    max_context_tokens: 4000,
    context_compression: false,
    citation_mode: "inline",
    context_formatting_template: "[{index}] {text}"
  },
  fields: [
    { name: "max_context_tokens", label: "Max context tokens", component: "slider", min: 512, max: 16000, step: 512 },
    { name: "context_compression", label: "Context compression", component: "switch" },
    {
      name: "citation_mode",
      label: "Citation mode",
      component: "select",
      options: [
        { label: "None", value: "none" },
        { label: "Inline", value: "inline" },
        { label: "Footnotes", value: "footnotes" }
      ]
    },
    {
      name: "context_formatting_template",
      label: "Context template",
      component: "textarea",
      rows: 3,
      placeholder: "[{index}] {text}"
    }
  ],
  submitLabel: "Save reading"
};

const workspaceRagRerankFormSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  api_key: z.string().optional(),
  api_base: z.string().optional()
});

export const workspaceRagRerankFormDefinition: ConfigFormDefinition<typeof workspaceRagRerankFormSchema> = {
  schema: workspaceRagRerankFormSchema,
  defaultValues: {
    provider: "jina",
    model: "cross-encoder-mini",
  },
  fields: [
    {
      name: "provider",
      label: "Reranker provider",
      component: "select",
      options: [
        { label: "Jina", value: "jina" },
        { label: "Cohere", value: "cohere" },
        { label: "OpenAI-compatible", value: "openai" }
      ]
    },
    {
      name: "model",
      label: "Reranker model",
      placeholder: "e.g. cross-encoder-mini"
    },
    { name: "api_key", label: "API Key (Secret)", component: "secret", placeholder: "User encrypted key" },
    { name: "api_base", label: "API Base URL", placeholder: "Optional custom endpoint" }
  ],
  submitLabel: "Save reranking"
};

const workspaceRagLlmFormSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(1).max(32000),
  streaming: z.boolean(),
  api_key: z.string().optional(),
  api_base: z.string().optional()
});

export const workspaceRagLlmFormDefinition: ConfigFormDefinition<typeof workspaceRagLlmFormSchema> = {
  schema: workspaceRagLlmFormSchema,
  defaultValues: {
    provider: "omniroute",
    model: "cost-saver",
    temperature: 0.2,
    max_tokens: 700,
    streaming: false
  },
  fields: [
    {
      name: "provider",
      label: "Model provider",
      component: "select",
      options: [
        { label: "OmniRoute", value: "omniroute" }
      ]
    },
    {
      name: "model",
      label: "Model name",
      component: "select",
      options: [
        { label: "cost-saver", value: "cost-saver" }
      ]
    },
    { name: "temperature", label: "Temperature", component: "slider", min: 0, max: 1, step: 0.05 },
    { name: "max_tokens", label: "Max tokens", component: "number", min: 1, max: 4096 },
    { name: "streaming", label: "Streaming", component: "switch" },
    { name: "api_key", label: "API Key (Secret)", component: "secret", placeholder: "User encrypted key" },
    { name: "api_base", label: "API Base URL", placeholder: "e.g. http://localhost:20128/v1" }
  ],
  submitLabel: "Save generation"
};

const workspaceRagPromptFormSchema = z.object({
  prompt_template: z.string().min(10)
});

export const workspaceRagPromptFormDefinition: ConfigFormDefinition<typeof workspaceRagPromptFormSchema> = {
  schema: workspaceRagPromptFormSchema,
  defaultValues: {
    prompt_template: "You are an assistant that answers using the provided context.\n\nContext:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:"
  },
  fields: [
    {
      name: "prompt_template",
      label: "System prompt",
      component: "textarea",
      rows: 10,
      placeholder: "You are an assistant that answers using the provided context."
    }
  ],
  submitLabel: "Save prompt"
};

const projectDocumentStorageFormSchema = z.object({
  provider: z.string().min(1),
  endpoint: z.string().optional(),
  access_key: z.string().optional(),
  secret_key: z.string().optional(),
  bucket: z.string().min(1),
  secure: z.boolean()
});

export const projectDocumentStorageFormDefinition: ConfigFormDefinition<typeof projectDocumentStorageFormSchema> = {
  schema: projectDocumentStorageFormSchema,
  defaultValues: {
    provider: "minio",
    endpoint: "",
    access_key: "",
    secret_key: "",
    bucket: "karag",
    secure: false
  },
  fields: [
    {
      name: "provider",
      label: "Storage Provider",
      component: "select",
      options: [
        { label: "MinIO", value: "minio" },
        { label: "Amazon S3", value: "s3" },
        { label: "Google Cloud Storage", value: "gcs" },
        { label: "Azure Document Storage", value: "azure-document-storage" }
      ]
    },
    {
      name: "endpoint",
      label: "Endpoint URL",
      placeholder: "http://minio:9000"
    },
    {
      name: "access_key",
      label: "Access Key",
      placeholder: "e.g. minioadmin"
    },
    {
      name: "secret_key",
      label: "Secret Key",
      component: "secret",
      placeholder: "e.g. minioadmin"
    },
    {
      name: "bucket",
      label: "Bucket / Container",
      placeholder: "karag"
    },
    {
      name: "secure",
      label: "Use SSL / HTTPS",
      component: "switch"
    }
  ],
  submitLabel: "Save Storage Configuration"
};
