import { z } from "zod";

import type { ConfigFormDefinition } from "@/components/config/types";

const organizationFormSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  description: z.string().optional()
});

export const organizationFormDefinition: ConfigFormDefinition<typeof organizationFormSchema> = {
  schema: organizationFormSchema,
  defaultValues: {
    id: "",
    name: "",
    description: ""
  },
  fields: [
    { name: "id", label: "Organization ID", placeholder: "org-acme", required: true },
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
  id: z.string().min(3),
  name: z.string().min(2),
  description: z.string().optional()
});

export const projectFormDefinition: ConfigFormDefinition<typeof projectFormSchema> = {
  schema: projectFormSchema,
  defaultValues: {
    id: "",
    name: "",
    description: ""
  },
  fields: [
    { name: "id", label: "Project ID", placeholder: "project-rag", required: true },
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
  id: z.string().min(3),
  name: z.string().min(2),
  description: z.string().optional()
});

export const workspaceFormDefinition: ConfigFormDefinition<typeof workspaceFormSchema> = {
  schema: workspaceFormSchema,
  defaultValues: {
    id: "",
    name: "",
    description: ""
  },
  fields: [
    { name: "id", label: "Workspace ID", placeholder: "workspace-prod", required: true },
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

const knowledgeDatasetFormSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  embedding_model: z.string().min(1),
  chunk_strategy: z.string().min(1)
});

export const knowledgeDatasetFormDefinition: ConfigFormDefinition<typeof knowledgeDatasetFormSchema> = {
  schema: knowledgeDatasetFormSchema,
  defaultValues: {
    workspace_id: "",
    name: "",
    description: "",
    embedding_model: "text-embedding-3-small",
    chunk_strategy: "pdf-page-window"
  },
  fields: [
    { name: "name", label: "Dataset name", placeholder: "DRL Cyber Security" },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "Optional notes"
    },
    {
      name: "embedding_model",
      label: "Embedding model",
      component: "select",
      options: [
        { label: "OpenAI text-embedding-3-small", value: "text-embedding-3-small" },
        { label: "Nomic Embed Text", value: "nomic-embed-text" },
        { label: "BGE Small", value: "bge-small-en-v1.5" }
      ]
    },
    {
      name: "chunk_strategy",
      label: "Chunk strategy",
      component: "select",
      options: [
        { label: "PDF page window", value: "pdf-page-window" },
        { label: "Word window", value: "word-window" },
        { label: "Semantic paragraphs", value: "semantic-paragraphs" }
      ]
    }
  ],
  submitLabel: "Create dataset"
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

const modelFormSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(1),
  framework: z.string().min(1),
  description: z.string().optional()
});

export const modelFormDefinition: ConfigFormDefinition<typeof modelFormSchema> = {
  schema: modelFormSchema,
  defaultValues: {
    name: "",
    type: "llm",
    framework: "openai",
    description: ""
  },
  fields: [
    { name: "name", label: "Model name", placeholder: "OpenAI PDF RAG" },
    {
      name: "type",
      label: "Model type",
      component: "select",
      options: [
        { label: "LLM", value: "llm" },
        { label: "Embedding", value: "embedding" },
        { label: "Reranker", value: "reranker" }
      ]
    },
    {
      name: "framework",
      label: "Framework",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" },
        { label: "Anthropic", value: "anthropic" }
      ]
    },
    {
      name: "description",
      label: "Description",
      component: "textarea",
      placeholder: "What is this model used for?"
    }
  ],
  submitLabel: "Register model"
};

const pipelineFormSchema = z.object({
  name: z.string().min(2),
  embeddingModel: z.string().min(1),
  chunkSize: z.number().min(32).max(512),
  retriever: z.string().min(1),
  reranker: z.string().min(1),
  topK: z.number().min(1).max(20),
  enabled: z.boolean()
});

export const pipelineFormDefinition: ConfigFormDefinition<typeof pipelineFormSchema> = {
  schema: pipelineFormSchema,
  defaultValues: {
    name: "",
    embeddingModel: "text-embedding-3-small",
    chunkSize: 128,
    retriever: "hybrid-search",
    reranker: "cross-encoder-mini",
    topK: 5,
    enabled: true
  },
  fields: [
    { name: "name", label: "Pipeline name", placeholder: "Production retrieval" },
    {
      name: "embeddingModel",
      label: "Embedding model",
      component: "select",
      options: [
        { label: "OpenAI text-embedding-3-small", value: "text-embedding-3-small" },
        { label: "Nomic Embed Text", value: "nomic-embed-text" },
        { label: "BGE Small", value: "bge-small-en-v1.5" }
      ]
    },
    {
      name: "chunkSize",
      label: "Chunk size",
      component: "slider",
      min: 32,
      max: 512,
      step: 16,
      description: "Token window used during document chunking."
    },
    {
      name: "retriever",
      label: "Retriever",
      component: "select",
      options: [
        { label: "Hybrid search", value: "hybrid-search" },
        { label: "Dense search", value: "dense-search" },
        { label: "Keyword + dense", value: "keyword-dense" }
      ]
    },
    {
      name: "reranker",
      label: "Reranker",
      component: "select",
      options: [
        { label: "Cross encoder mini", value: "cross-encoder-mini" },
        { label: "Cohere rerank", value: "cohere-rerank" },
        { label: "Disabled", value: "disabled" }
      ]
    },
    {
      name: "topK",
      label: "Top K",
      component: "number",
      min: 1,
      max: 20
    },
    {
      name: "enabled",
      label: "Pipeline enabled",
      component: "toggle"
    }
  ],
  submitLabel: "Save pipeline"
};

const providerFormSchema = z.object({
  name: z.string().min(2),
  providerType: z.string().min(1),
  endpoint: z.string().optional(),
  defaultModel: z.string().optional(),
  apiKey: z.string().optional(),
  enabledCapabilities: z.array(z.string()).default([])
});

export const providerFormDefinition: ConfigFormDefinition<typeof providerFormSchema> = {
  schema: providerFormSchema,
  defaultValues: {
    name: "",
    providerType: "openai",
    endpoint: "",
    defaultModel: "gpt-4o-mini",
    apiKey: "",
    enabledCapabilities: ["chat", "embeddings"]
  },
  fields: [
    { name: "name", label: "Provider label", placeholder: "Primary OpenAI" },
    {
      name: "providerType",
      label: "Provider type",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "Qdrant", value: "qdrant" },
        { label: "MinIO", value: "minio" }
      ]
    },
    {
      name: "endpoint",
      label: "Endpoint",
      placeholder: "https://api.openai.com/v1"
    },
    {
      name: "defaultModel",
      label: "Default model",
      placeholder: "gpt-4o-mini"
    },
    {
      name: "apiKey",
      label: "Secret or API key",
      component: "secret"
    },
    {
      name: "enabledCapabilities",
      label: "Capabilities",
      component: "multiselect",
      options: [
        { label: "Chat", value: "chat" },
        { label: "Embeddings", value: "embeddings" },
        { label: "Reranking", value: "reranking" },
        { label: "Moderation", value: "moderation" }
      ]
    }
  ],
  submitLabel: "Save provider"
};

const apiKeyFormSchema = z.object({
  name: z.string().min(2),
  scope: z.string().min(1)
});

export const apiKeyFormDefinition: ConfigFormDefinition<typeof apiKeyFormSchema> = {
  schema: apiKeyFormSchema,
  defaultValues: {
    name: "",
    scope: "rag.query"
  },
  fields: [
    { name: "name", label: "Key name", placeholder: "SDK integration key" },
    {
      name: "scope",
      label: "Scope",
      component: "select",
      options: [
        { label: "rag.query", value: "rag.query" },
        { label: "documents.write", value: "documents.write" },
        { label: "models.read", value: "models.read" },
        { label: "observability.read", value: "observability.read" }
      ]
    }
  ],
  submitLabel: "Create API key"
};

const settingsFormSchema = z.object({
  storageProvider: z.string().min(1),
  embeddingProvider: z.string().min(1),
  defaultPipeline: z.string().min(1),
  systemLimits: z.number().min(1).max(100),
  maxUploadMb: z.number().min(1).max(500),
  promptRedaction: z.boolean()
});

export const settingsFormDefinition: ConfigFormDefinition<typeof settingsFormSchema> = {
  schema: settingsFormSchema,
  defaultValues: {
    storageProvider: "minio",
    embeddingProvider: "openai",
    defaultPipeline: "production-default",
    systemLimits: 25,
    maxUploadMb: 50,
    promptRedaction: true
  },
  fields: [
    {
      name: "storageProvider",
      label: "Storage provider",
      component: "select",
      options: [
        { label: "MinIO", value: "minio" },
        { label: "Amazon S3", value: "s3" }
      ]
    },
    {
      name: "embeddingProvider",
      label: "Embedding provider",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" }
      ]
    },
    {
      name: "defaultPipeline",
      label: "Default pipeline",
      placeholder: "production-default"
    },
    {
      name: "systemLimits",
      label: "Concurrent jobs",
      component: "slider",
      min: 1,
      max: 100,
      step: 1
    },
    {
      name: "maxUploadMb",
      label: "Max upload size (MB)",
      component: "number",
      min: 1,
      max: 500
    },
    {
      name: "promptRedaction",
      label: "Redact prompts by default",
      component: "toggle"
    }
  ],
  submitLabel: "Save workspace settings"
};

const workspaceAgentFormSchema = z.object({
  systemPrompt: z.string().min(10),
  llmProvider: z.string().min(1),
  llmModel: z.string().min(1),
  retrievalTopK: z.number().min(1).max(10),
  temperature: z.number().min(0).max(1)
});

export const workspaceAgentFormDefinition: ConfigFormDefinition<typeof workspaceAgentFormSchema> = {
  schema: workspaceAgentFormSchema,
  defaultValues: {
    systemPrompt: "You are a precise enterprise RAG assistant. Use the selected project documents and cite retrieved facts when possible.",
    llmProvider: "openai",
    llmModel: "gpt-4o-mini",
    retrievalTopK: 3,
    temperature: 0.2
  },
  fields: [
    {
      name: "systemPrompt",
      label: "System prompt",
      component: "textarea",
      placeholder: "Enter the system prompt"
    },
    {
      name: "llmProvider",
      label: "Provider",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" }
      ]
    },
    {
      name: "llmModel",
      label: "Model",
      component: "select",
      options: [
        { label: "GPT-4o mini", value: "gpt-4o-mini" },
        { label: "GPT-4.1 mini", value: "gpt-4.1-mini" },
        { label: "Llama 3.1 8B", value: "meta-llama/Llama-3.1-8B-Instruct" }
      ]
    },
    {
      name: "retrievalTopK",
      label: "Retrieved chunks",
      component: "number",
      min: 1,
      max: 10
    },
    {
      name: "temperature",
      label: "Temperature",
      component: "slider",
      min: 0,
      max: 1,
      step: 0.05
    }
  ],
  submitLabel: "Save workspace configuration"
};

const ragQueryFormSchema = z.object({
  query: z.string().min(5),
  top_k: z.number().min(1).max(10),
  llm_provider: z.string().min(1),
  llm_model: z.string().min(1)
});

export const ragQueryFormDefinition: ConfigFormDefinition<typeof ragQueryFormSchema> = {
  schema: ragQueryFormSchema,
  defaultValues: {
    query: "",
    top_k: 3,
    llm_provider: "openai",
    llm_model: "gpt-4o-mini"
  },
  fields: [
    {
      name: "query",
      label: "Question",
      component: "textarea",
      placeholder: "Ask a question about this dataset"
    },
    {
      name: "top_k",
      label: "Retrieved chunks",
      component: "number",
      min: 1,
      max: 10
    },
    {
      name: "llm_provider",
      label: "Provider",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" }
      ]
    },
    {
      name: "llm_model",
      label: "Model",
      component: "select",
      options: [
        { label: "GPT-4o mini", value: "gpt-4o-mini" },
        { label: "GPT-4.1 mini", value: "gpt-4.1-mini" },
        { label: "Llama 3.1 8B", value: "meta-llama/Llama-3.1-8B-Instruct" }
      ]
    }
  ],
  submitLabel: "Run query"
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
    { name: "score_threshold", label: "Score threshold", component: "number", min: 0, max: 1, step: 0.01 },
    { name: "hybrid_search", label: "Hybrid search", component: "toggle" },
    { name: "reranker_model", label: "Reranker model", placeholder: "cross-encoder-mini" },
    { name: "chunk_size", label: "Chunk size", component: "number", min: 64, max: 4096 },
    { name: "chunk_overlap", label: "Chunk overlap", component: "number", min: 0, max: 1024 }
  ],
  submitLabel: "Save retrieval"
};

const workspaceRagEmbeddingFormSchema = z.object({
  embedding_provider: z.string().min(1),
  embedding_model: z.string().min(1),
  embedding_dimension: z.number().nullable().optional(),
  embedding_batch_size: z.number().min(1).max(512)
});

export const workspaceRagEmbeddingFormDefinition: ConfigFormDefinition<typeof workspaceRagEmbeddingFormSchema> = {
  schema: workspaceRagEmbeddingFormSchema,
  defaultValues: {
    embedding_provider: "openai",
    embedding_model: "text-embedding-3-small",
    embedding_dimension: 1536,
    embedding_batch_size: 16
  },
  fields: [
    {
      name: "embedding_provider",
      label: "Embedding provider",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" }
      ]
    },
    { name: "embedding_model", label: "Embedding model", placeholder: "text-embedding-3-small" },
    { name: "embedding_dimension", label: "Embedding dimension", component: "number", min: 0, max: 8192 },
    { name: "embedding_batch_size", label: "Batch size", component: "number", min: 1, max: 512 }
  ],
  submitLabel: "Save embedding"
};

const workspaceRagVectorStoreFormSchema = z.object({
  vector_store_type: z.string().min(1),
  collection_name: z.string().optional(),
  distance_metric: z.string().min(1),
  index_type: z.string().min(1)
});

export const workspaceRagVectorStoreFormDefinition: ConfigFormDefinition<typeof workspaceRagVectorStoreFormSchema> = {
  schema: workspaceRagVectorStoreFormSchema,
  defaultValues: {
    vector_store_type: "qdrant",
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
        { label: "Qdrant", value: "qdrant" },
        { label: "pgvector", value: "pgvector" },
        { label: "Weaviate", value: "weaviate" },
        { label: "Milvus", value: "milvus" },
        { label: "Redis", value: "redis" }
      ]
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
    { name: "index_type", label: "Index type", placeholder: "hnsw" }
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
    { name: "max_context_tokens", label: "Max context tokens", component: "number", min: 128, max: 64000 },
    { name: "context_compression", label: "Context compression", component: "toggle" },
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

const workspaceRagLlmFormSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(1).max(32000),
  streaming: z.boolean()
});

export const workspaceRagLlmFormDefinition: ConfigFormDefinition<typeof workspaceRagLlmFormSchema> = {
  schema: workspaceRagLlmFormSchema,
  defaultValues: {
    provider: "openai",
    model: "gpt-4o-mini",
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
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" },
        { label: "Anthropic", value: "anthropic" }
      ]
    },
    { name: "model", label: "Model name", placeholder: "gpt-4o-mini" },
    { name: "temperature", label: "Temperature", component: "slider", min: 0, max: 2, step: 0.05 },
    { name: "max_tokens", label: "Max tokens", component: "number", min: 1, max: 32000 },
    { name: "streaming", label: "Streaming", component: "toggle" }
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
