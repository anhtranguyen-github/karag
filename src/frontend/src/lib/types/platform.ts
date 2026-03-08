export type OrganizationSummary = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
};

export type ProjectSummary = {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  created_at: string;
};

export type WorkspaceSummary = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  created_at: string;
};

export type WorkspaceRetrievalConfig = {
  top_k: number;
  score_threshold: number;
  hybrid_search: boolean;
  reranker_model: string;
  chunk_size: number;
  chunk_overlap: number;
};

export type WorkspaceVectorStoreConfig = {
  collection_name?: string | null;
  distance_metric: string;
  index_type: string;
};

export type WorkspaceReadingConfig = {
  max_context_tokens: number;
  context_compression: boolean;
  citation_mode: string;
  context_formatting_template: string;
};

export type WorkspaceLlmConfig = {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  streaming: boolean;
};

export type WorkspaceRagConfig = {
  workspace_id: string;
  organization_id: string;
  project_id: string;
  embedding_provider: string;
  embedding_model: string;
  embedding_dimension?: number | null;
  embedding_batch_size: number;
  vector_store_type: string;
  vector_store_config: WorkspaceVectorStoreConfig;
  retrieval_config: WorkspaceRetrievalConfig;
  reading_config: WorkspaceReadingConfig;
  llm_config: WorkspaceLlmConfig;
  prompt_template: string;
  updated_at: string;
};

export type WorkspaceRagConfigUpdate = Omit<
  WorkspaceRagConfig,
  "workspace_id" | "organization_id" | "project_id" | "updated_at"
>;

export type KnowledgeDatasetDetail = {
  id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  embedding_model: string;
  chunk_strategy: string;
  created_at: string;
  document_count: number;
  chunk_count: number;
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

export type ChunkSummary = {
  id: string;
  document_id: string;
  dataset_id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  text: string;
  token_count: number;
  created_at: string;
};

export type DocumentUploadResponse = {
  document: DocumentSummary;
  chunks_created: number;
  events: string[];
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

export type ModelSummary = {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  framework: string;
  description?: string | null;
  lifecycle_state: string;
  created_at: string;
};

export type ModelVersionSummary = {
  id: string;
  model_id: string;
  organization_id: string;
  version: string;
  release_notes?: string | null;
  lifecycle_state: string;
  created_at: string;
};

export type ModelArtifactSummary = {
  id: string;
  model_version_id: string;
  organization_id: string;
  name: string;
  artifact_type: string;
  storage_backend: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ModelDeploymentSummary = {
  id: string;
  model_version_id: string;
  organization_id: string;
  project_id: string;
  workspace_id: string;
  target: string;
  inference_url: string;
  configuration: Record<string, unknown>;
  lifecycle_state: string;
  created_at: string;
};

export type RuntimeModelSummary = {
  provider: string;
  kind: "llm" | "embedding";
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

export type ProjectProviderRecord = {
  id: string;
  projectId: string;
  providerType: string;
  name: string;
  config: Record<string, unknown>;
  status: "not-configured" | "connected" | "failed";
  createdAt: string;
};

export type ProjectApiKeyRecord = {
  id: string;
  projectId: string;
  name: string;
  value: string;
  scope: string;
  usageCount: number;
  createdAt: string;
  revokedAt?: string | null;
};

export type ProjectSettingRecord = {
  projectId: string;
  storageProvider: string;
  embeddingProvider: string;
  defaultPipeline: string;
  systemLimits: number;
  maxUploadMb: number;
  promptRedaction: boolean;
};

export type WorkspaceContextDocumentSelection = {
  workspaceId: string;
  documentIds: string[];
};

export type WorkspaceAgentConfig = {
  workspaceId: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  retrievalTopK: number;
  temperature: number;
};

export type PipelineConfig = {
  id: string;
  workspaceId: string;
  name: string;
  embeddingModel: string;
  chunkSize: number;
  retriever: string;
  reranker: string;
  topK: number;
  enabled: boolean;
  createdAt: string;
};

export type ProviderConfig = {
  id: string;
  workspaceId: string;
  providerType: string;
  name: string;
  config: Record<string, unknown>;
  status: "not-configured" | "connected" | "failed";
  createdAt: string;
};

export type ApiKeyRecord = {
  id: string;
  workspaceId: string;
  name: string;
  value: string;
  scope: string;
  usageCount: number;
  createdAt: string;
  revokedAt?: string | null;
};

export type WorkspaceSettingRecord = {
  workspaceId: string;
  storageProvider: string;
  embeddingProvider: string;
  defaultPipeline: string;
  systemLimits: number;
  maxUploadMb: number;
  promptRedaction: boolean;
};

export type ExperimentRecord = {
  id: string;
  workspaceId: string;
  evaluationDatasetId: string;
  knowledgeDatasetId: string;
  provider: string;
  model: string;
  averageScore: number;
  totalQuestions: number;
  createdAt: string;
};
