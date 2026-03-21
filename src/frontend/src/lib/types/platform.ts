export type OrganizationSummary = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
};

export type ProjectSummary = {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  status: string;
  document_storage_config: {
    provider: string;
    endpoint?: string | null;
    access_key?: string | null;
    secret_key?: string | null;
    bucket: string;
    secure: boolean;
  };
  created_at: string;
};

export type WorkspaceSummary = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
};

export type WorkspaceEmbeddingConfig = {
  component: string;
  provider: string;
  model: string;
  dimension?: number | null;
  batch_size: number;
  api_key?: string | null;
  api_base?: string | null;
};

export type WorkspaceChunkingConfig = {
  component: string;
  chunk_size: number;
  chunk_overlap: number;
};

export type WorkspaceVectorStoreConfig = {
  component: string;
  url?: string | null;
  api_key?: string | null;
  collection_name?: string | null;
  distance_metric: string;
  index_type: string;
  vector_dimension?: number | null;
};

export type WorkspaceRetrieverConfig = {
  component: string;
  top_k: number;
  score_threshold: number;
};

export type WorkspaceRerankConfig = {
  component: string;
  provider: string;
  model: string;
  top_k?: number;
  api_key?: string | null;
  api_base?: string | null;
};

export type WorkspaceLlmConfig = {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  streaming: boolean;
  api_key?: string | null;
  api_base?: string | null;
};

export type WorkspaceRagBehaviorConfig = {
  reader: string;
  query_transformer: string;
  generator: string;
  prompt_template: string;
  max_context_tokens: number;
  context_compression: boolean;
  citation_mode: string;
  context_formatting_template: string;
};

export type WorkspaceRagConfig = {
  workspace_id: string;
  embedding: WorkspaceEmbeddingConfig;
  chunking: WorkspaceChunkingConfig;
  vectorstore: WorkspaceVectorStoreConfig;
  retriever: WorkspaceRetrieverConfig;
  reranker: WorkspaceRerankConfig;
  llm: WorkspaceLlmConfig;
  rag: WorkspaceRagBehaviorConfig;
  features: Record<string, unknown>;
  updated_at: string;
};

export type WorkspaceRagConfigUpdate = Partial<{
  embedding: Partial<WorkspaceEmbeddingConfig>;
  chunking: Partial<WorkspaceChunkingConfig>;
  vectorstore: Partial<WorkspaceVectorStoreConfig>;
  retriever: Partial<WorkspaceRetrieverConfig>;
  reranker: Partial<WorkspaceRerankConfig>;
  llm: Partial<WorkspaceLlmConfig>;
  rag: Partial<WorkspaceRagBehaviorConfig>;
  features: Record<string, unknown>;
}>;

export type RagPipelineCompatibilityCheck = {
  name: string;
  status: string;
  message: string;
};

export type RagPipelineComponentMetadata = {
  implementation: string;
  enabled: boolean;
  details: Record<string, unknown>;
};

export type RagPipelineAudit = {
  valid: boolean;
  current_pipeline: Record<string, string>;
  pipeline_graph: string[];
  compatibility: RagPipelineCompatibilityCheck[];
  components: Record<string, RagPipelineComponentMetadata>;
  available_components: Record<string, string[]>;
};

export type DocumentSummary = {
  id: string;
  dataset_id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type EvaluationDatasetSummary = {
  id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  created_at: string;
};

export type EvaluationQuestionSummary = {
  id: string;
  evaluation_dataset_id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  question: string;
  expected_answer: string;
  expected_context?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type EvaluationRunQuestionResult = {
  question_id: string;
  answer: string;
  retrieved_contexts: string[];
  expected_answer: string;
  lexical_overlap_score: number;
};

export type EvaluationRunResult = {
  id: string;
  evaluation_dataset_id: string;
  knowledge_dataset_id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  total_questions: number;
  average_score: number;
  created_at: string;
  question_results: EvaluationRunQuestionResult[];
};

export type RuntimeModelSummary = {
  provider: string;
  kind: "llm" | "embedding" | "reranking";
  models: string[];
};

export type ChatCompletionResponse = {
  provider: string;
  model: string;
  content: string;
  usage: Record<string, number>;
};

export type DependencyHealth = {
  status: string;
  providers: {
    vector_store: string;
    storage_provider: string;
    event_bus: string;
    embedding_provider: string;
    llm_provider: string;
    rerank_provider: string;
  };
  counts: Record<string, number>;
};

export type TraceSummary = {
  trace_id: string;
  trace_type: string;
  organization_id: string;
  project_id: string;
  workspace_id?: string | null;
  resource_id?: string | null;
  status: string;
  captured: Record<string, unknown>;
  metrics: Record<string, number>;
  created_at: string;
};

export type EventSummary = {
  event_type: string;
  resource_id: string;
  workspace_id?: string | null;
  occurred_at: string;
};

export type ObservabilitySummary = {
  trace_counts: Record<string, number>;
  event_counts: Record<string, number>;
  recent_traces?: TraceSummary[];
  event_bus: string;
  events: EventSummary[];
};

export type RagChunkResult = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  score: number;
  text: string;
};

export type RagQueryResponse = {
  answer: string;
  provider: string;
  model: string;
  prompt: string;
  chunks: RagChunkResult[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type TenantSelection = {
  organizationId?: string;
  projectId?: string;
  workspaceId?: string;
  actorId?: string;
};

export type ChatMessageSummary = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type ChatSessionSummary = {
  id: string;
  title?: string | null;
  workspace_id: string;
  project_id: string;
  organization_id: string;
  user_id: string;
  created_at: string;
};
