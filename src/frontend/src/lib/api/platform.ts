import { request, uploadWithProgress } from "@/lib/api/client";
import type {
  ChatCompletionResponse,
  ChunkSummary,
  DependencyHealth,
  DocumentSummary,
  DocumentUploadResponse,
  EvaluationDatasetSummary,
  EvaluationQuestionSummary,
  EvaluationRunResult,
  KnowledgeDatasetDetail,
  ModelArtifactSummary,
  ModelDeploymentSummary,
  ModelSummary,
  ModelVersionSummary,
  ObservabilitySummary,
  OrganizationSummary,
  ProjectSummary,
  RagQueryResponse,
  RuntimeModelSummary,
  TenantSelection,
  WorkspaceRagConfig,
  WorkspaceRagConfigUpdate,
  WorkspaceSummary
} from "@/lib/types/platform";

export const platformApi = {
  health: () => request<{ status: string }>("/health"),
  dependencyHealth: () => request<DependencyHealth>("/health/dependencies"),
  observabilitySummary: () => request<ObservabilitySummary>("/api/v1/observability/summary"),

  listOrganizations: () => request<OrganizationSummary[]>("/api/v1/organizations"),
  createOrganization: (body: { id: string; name: string; description?: string }) =>
    request<OrganizationSummary>("/api/v1/organizations", { method: "POST", body }),

  listProjects: (organizationId: string) =>
    request<ProjectSummary[]>(`/api/v1/organizations/${organizationId}/projects`),
  createProject: (
    organizationId: string,
    body: { id: string; name: string; description?: string }
  ) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects`, {
      method: "POST",
      body
    }),

  listWorkspaces: (tenant: TenantSelection) =>
    request<WorkspaceSummary[]>("/api/v1/workspaces", { tenant }),
  createWorkspace: (
    tenant: TenantSelection,
    body: { id: string; name: string; description?: string }
  ) =>
    request<WorkspaceSummary>("/api/v1/workspaces", { method: "POST", tenant, body }),
  deleteWorkspace: (tenant: TenantSelection, workspaceId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}`, { method: "DELETE", tenant }),
  getWorkspaceRagConfig: (tenant: TenantSelection, workspaceId: string) =>
    request<WorkspaceRagConfig>(`/api/v1/workspaces/${workspaceId}/rag-config`, { tenant }),
  updateWorkspaceRagConfig: (
    tenant: TenantSelection,
    workspaceId: string,
    body: WorkspaceRagConfigUpdate
  ) =>
    request<WorkspaceRagConfig>(`/api/v1/workspaces/${workspaceId}/rag-config`, {
      method: "PUT",
      tenant,
      body
    }),

  listKnowledgeDatasets: (tenant: TenantSelection, workspaceId: string) =>
    request<KnowledgeDatasetDetail[]>(
      `/api/v1/knowledge-datasets?workspace_id=${encodeURIComponent(workspaceId)}`,
      { tenant }
    ),
  createKnowledgeDataset: (
    tenant: TenantSelection,
    body: {
      workspace_id: string;
      name: string;
      description?: string;
      embedding_model: string;
      chunk_strategy: string;
    }
  ) =>
    request<KnowledgeDatasetDetail>("/api/v1/knowledge-datasets", {
      method: "POST",
      tenant,
      body
    }),
  deleteKnowledgeDataset: (tenant: TenantSelection, datasetId: string) =>
    request<void>(`/api/v1/knowledge-datasets/${datasetId}`, {
      method: "DELETE",
      tenant
    }),
  listDatasetDocuments: (tenant: TenantSelection, datasetId: string) =>
    request<DocumentSummary[]>(`/api/v1/knowledge-datasets/${datasetId}/documents`, { tenant }),
  listDatasetChunks: (tenant: TenantSelection, datasetId: string) =>
    request<ChunkSummary[]>(`/api/v1/knowledge-datasets/${datasetId}/chunks`, { tenant }),
  uploadDatasetDocument: (
    tenant: TenantSelection,
    datasetId: string,
    file: File,
    onProgress?: (value: number) => void
  ) =>
    uploadWithProgress<DocumentUploadResponse>(
      `/api/v1/knowledge-datasets/${datasetId}/documents`,
      file,
      "file",
      tenant,
      onProgress
    ),
  listRuntimeDocuments: (tenant: TenantSelection, workspaceId: string) =>
    request<DocumentSummary[]>(`/v1/documents?workspace_id=${encodeURIComponent(workspaceId)}`, {
      tenant
    }),
  ragQuery: (
    tenant: TenantSelection,
    body: {
      workspace_id: string;
      knowledge_dataset_id: string;
      query: string;
      top_k?: number;
      llm_provider?: string;
      llm_model?: string;
    }
  ) =>
    request<RagQueryResponse>("/v1/rag/query", { method: "POST", tenant, body }),

  listEvaluationDatasets: (tenant: TenantSelection, workspaceId: string) =>
    request<EvaluationDatasetSummary[]>(
      `/api/v1/evaluation-datasets?workspace_id=${encodeURIComponent(workspaceId)}`,
      { tenant }
    ),
  createEvaluationDataset: (
    tenant: TenantSelection,
    body: { workspace_id: string; name: string; description?: string }
  ) =>
    request<EvaluationDatasetSummary>("/api/v1/evaluation-datasets", {
      method: "POST",
      tenant,
      body
    }),
  deleteEvaluationDataset: (tenant: TenantSelection, datasetId: string) =>
    request<void>(`/api/v1/evaluation-datasets/${datasetId}`, {
      method: "DELETE",
      tenant
    }),
  listEvaluationQuestions: (tenant: TenantSelection, datasetId: string) =>
    request<EvaluationQuestionSummary[]>(
      `/api/v1/evaluation-datasets/${datasetId}/questions`,
      { tenant }
    ),
  createEvaluationQuestion: (
    tenant: TenantSelection,
    datasetId: string,
    body: {
      question: string;
      expected_answer: string;
      expected_context?: string;
      metadata?: Record<string, unknown>;
    }
  ) =>
    request<EvaluationQuestionSummary>(`/api/v1/evaluation-datasets/${datasetId}/questions`, {
      method: "POST",
      tenant,
      body
    }),
  runEvaluation: (
    tenant: TenantSelection,
    datasetId: string,
    body: {
      knowledge_dataset_id: string;
      top_k: number;
      llm_provider?: string;
      llm_model?: string;
    }
  ) =>
    request<EvaluationRunResult>(`/api/v1/evaluation-datasets/${datasetId}/run`, {
      method: "POST",
      tenant,
      body
    }),

  listModels: (tenant: TenantSelection) => request<ModelSummary[]>("/api/v1/models", { tenant }),
  createModel: (
    tenant: TenantSelection,
    body: { name: string; type: string; framework: string; description?: string }
  ) =>
    request<ModelSummary>("/api/v1/models", {
      method: "POST",
      tenant,
      body
    }),
  listModelVersions: (tenant: TenantSelection, modelId: string) =>
    request<ModelVersionSummary[]>(`/api/v1/models/${modelId}/versions`, { tenant }),
  createModelVersion: (
    tenant: TenantSelection,
    modelId: string,
    body: { version: string; release_notes?: string }
  ) =>
    request<ModelVersionSummary>(`/api/v1/models/${modelId}/versions`, {
      method: "POST",
      tenant,
      body
    }),
  listModelArtifacts: (tenant: TenantSelection, versionId: string) =>
    request<ModelArtifactSummary[]>(`/api/v1/model-versions/${versionId}/artifacts`, { tenant }),
  createModelArtifact: (
    tenant: TenantSelection,
    versionId: string,
    body: {
      name: string;
      artifact_type: string;
      storage_backend: string;
      metadata?: Record<string, unknown>;
    }
  ) =>
    request<ModelArtifactSummary>(`/api/v1/model-versions/${versionId}/artifacts`, {
      method: "POST",
      tenant,
      body
    }),
  listModelDeployments: (tenant: TenantSelection, versionId: string) =>
    request<ModelDeploymentSummary[]>(`/api/v1/model-versions/${versionId}/deployments`, {
      tenant
    }),
  createModelDeployment: (
    tenant: TenantSelection,
    versionId: string,
    body: {
      workspace_id: string;
      target: string;
      inference_url: string;
      configuration?: Record<string, unknown>;
    }
  ) =>
    request<ModelDeploymentSummary>(`/api/v1/model-versions/${versionId}/deployments`, {
      method: "POST",
      tenant,
      body
    }),

  runtimeModels: () => request<RuntimeModelSummary[]>("/v1/models"),
  chatCompletion: (
    tenant: TenantSelection,
    body: {
      provider: string;
      model: string;
      workspace_id?: string;
      messages: Array<{ role: string; content: string }>;
    }
  ) => request<ChatCompletionResponse>("/v1/chat/completions", { method: "POST", tenant, body }),
  verifyChatProvider: (
    tenant: TenantSelection,
    body: { provider: string; model: string; workspace_id?: string }
  ) =>
    request<ChatCompletionResponse>(
      "/v1/chat/completions",
      {
        method: "POST",
        tenant,
        body: {
          provider: body.provider,
          model: body.model,
          workspace_id: body.workspace_id,
          messages: [{ role: "user", content: "Reply with the single word ready." }]
        }
      }
    )
};
