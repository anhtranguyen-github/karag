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

export type ScopeMemberSummary = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  mfa_enabled: boolean;
  organization_id: string;
  project_id?: string | null;
  inherited: boolean;
  created_at: string;
};

export type ApiKeySummary = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  masked_key?: string | null;
  is_active: boolean;
  created_at: string;
};

export type ApiKeyCreated = ApiKeySummary & {
  key_value: string;
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

export type ProjectDocumentSummary = {
  id: string;
  project_id: string;
  organization_id: string;
  workspace_id?: string | null;
  storage_path: string;
  title: string;
  extension: string;
  file_size: number;
  labels: string[];
  source: string;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  workspace_count?: number;
  latest_ingestion?: IngestionSummary | null;
};

export type IngestionSummary = {
  job_id?: string;
  document_id: string;
  workspace_id?: string;
  track_id: string;
  status: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

export type IngestFilesResponse = {
  status: string;
  ingestions: IngestionSummary[];
};

export type WorkspaceUploadResponse = {
  document: ProjectDocumentSummary;
  ingestion?: IngestionSummary | null;
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
  trace?: string[];
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

export type EffectivePermissionsSummary = {
  organization_id: string;
  project_id?: string | null;
  actor_id: string;
  permissions: string[];
};

export type ChatMessageSummary = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: {
    sources?: RagChunkResult[];
    trace?: string[];
    error?: {
      code: string;
      message: string;
      detail?: string;
    };
    [key: string]: any;
  };
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
