import { request, uploadWithProgress } from "@/lib/api/client";
import type {
  ChatCompletionResponse,
  DependencyHealth,
  DocumentSummary,
  EvaluationDatasetSummary,
  EvaluationQuestionSummary,
  EvaluationRunResult,
  ObservabilitySummary,
  OrganizationSummary,
  ProjectSummary,
  RagQueryResponse,
  RuntimeModelSummary,
  RagPipelineAudit,
  TenantSelection,
  WorkspaceRagConfig,
  WorkspaceRagConfigUpdate,
  WorkspaceSummary,
  ChatMessageSummary,
  ChatSessionSummary
} from "@/lib/types/platform";

export const platformApi = {
  health: () => request<{ status: string }>("/health"),
  dependencyHealth: () => request<DependencyHealth>("/health/dependencies"),
  observabilitySummary: () => request<ObservabilitySummary>("/api/v1/observability/summary"),

  listOrganizations: () => request<OrganizationSummary[]>("/api/v1/organizations"),
  createOrganization: (body: { id?: string; name: string; description?: string }) =>
    request<OrganizationSummary>("/api/v1/organizations", { method: "POST", body }),

  listProjects: (organizationId: string) =>
    request<ProjectSummary[]>(`/api/v1/organizations/${organizationId}/projects`),
  createProject: (
    organizationId: string,
    body: { id?: string; name: string; description?: string }
  ) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects`, {
      method: "POST",
      body
    }),
  getProject: (organizationId: string, projectId: string) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects/${projectId}`),
  updateProject: (
    organizationId: string,
    projectId: string,
    body: { name?: string; description?: string; document_storage_config?: any }
  ) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects/${projectId}`, {
      method: "PUT",
      body
    }),

  listWorkspaces: (tenant: TenantSelection) =>
    request<WorkspaceSummary[]>("/api/v1/workspaces", { tenant }),
  createWorkspace: (
    tenant: TenantSelection,
    body: { id?: string; name: string; description?: string }
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
  getWorkspaceRagPipelineAudit: (tenant: TenantSelection, workspaceId: string) =>
    request<RagPipelineAudit>(`/api/v1/workspaces/${workspaceId}/rag-pipeline/audit`, { tenant }),
  validateWorkspaceRagPipeline: (
    tenant: TenantSelection,
    workspaceId: string,
    body: WorkspaceRagConfigUpdate
  ) =>
    request<RagPipelineAudit>(`/api/v1/workspaces/${workspaceId}/rag-pipeline/validate`, {
      method: "POST",
      tenant,
      body
    }),

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
    ),
  
  // Phase 2 Chat Sessions
  listChatSessions: (tenant: TenantSelection) =>
    request<ChatSessionSummary[]>("/api/v1/chat/sessions", { tenant }),
  createChatSession: (tenant: TenantSelection, body: { workspace_id: string; project_id: string; organization_id: string; title?: string }) =>
    request<ChatSessionSummary>("/api/v1/chat/sessions", { method: "POST", tenant, body }),
  askChatSession: (tenant: TenantSelection, sessionId: string, query: string) =>
    request<ChatCompletionResponse>(`/api/v1/chat/sessions/${sessionId}/ask?query=${encodeURIComponent(query)}`, { method: "POST", tenant }),
  listChatMessages: (tenant: TenantSelection, sessionId: string) =>
    request<ChatMessageSummary[]>(`/api/v1/chat/sessions/${sessionId}/messages`, { tenant })
};
