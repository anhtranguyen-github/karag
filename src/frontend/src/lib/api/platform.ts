import { request, uploadWithProgress } from "@/lib/api/client";
import type {
  ApiKeyCreated,
  ApiKeySummary,
  ChatCompletionResponse,
  DependencyHealth,
  DocumentSummary,
  EffectivePermissionsSummary,
  IngestFilesResponse,
  OrganizationSummary,
  ProjectDocumentSummary,
  ProjectSummary,
  RagQueryResponse,
  RuntimeModelSummary,
  ScopeMemberSummary,
  TenantSelection,
  WorkspaceUploadResponse,
  WorkspaceSummary,
  ChatMessageSummary,
  ChatSessionSummary
} from "@/lib/types/platform";

type RawWorkspaceDocument = ProjectDocumentSummary & {
  rag_status?: string;
  rag_progress?: number;
  rag_error?: string | null;
  rag_chunk_count?: number;
};

type RawIngestFilesResponse = {
  status: string;
  results?: Array<{ document_id: string; track_id?: string; job_id?: string; status?: string; workspace_id?: string; error_message?: string | null; created_at?: string; updated_at?: string; completed_at?: string | null }>;
  ingestions?: Array<{ document_id: string; track_id: string; status?: string; job_id?: string; workspace_id?: string; error_message?: string | null; created_at?: string; updated_at?: string; completed_at?: string | null }>;
};

export const platformApi = {
  health: () => request<{ status: string }>("/health"),
  dependencyHealth: () => request<DependencyHealth>("/health/dependencies"),

  listOrganizations: (tenant?: TenantSelection) =>
    request<OrganizationSummary[]>("/api/v1/organizations", { tenant }),
  getOrganization: (organizationId: string, tenant?: TenantSelection) =>
    request<OrganizationSummary>(`/api/v1/organizations/${organizationId}`, { tenant }),
  createOrganization: (body: { id?: string; name: string; description?: string }, tenant?: TenantSelection) =>
    request<OrganizationSummary>("/api/v1/organizations", { method: "POST", body, tenant }),
  updateOrganization: (
    organizationId: string,
    body: { name?: string; description?: string; status?: string },
    tenant?: TenantSelection
  ) =>
    request<OrganizationSummary>(`/api/v1/organizations/${organizationId}`, {
      method: "PUT",
      body,
      tenant
    }),

  listProjects: (organizationId: string, tenant?: TenantSelection) =>
    request<ProjectSummary[]>(`/api/v1/organizations/${organizationId}/projects`, { tenant }),
  createProject: (
    organizationId: string,
    body: { id?: string; name: string; description?: string },
    tenant?: TenantSelection
  ) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects`, {
      method: "POST",
      body,
      tenant
    }),
  getProject: (tenant: TenantSelection, organizationId: string, projectId: string) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects/${projectId}`, {
      tenant
    }),
  updateProject: (
    tenant: TenantSelection,
    organizationId: string,
    projectId: string,
    body: { name?: string; description?: string; document_storage_config?: any }
  ) =>
    request<ProjectSummary>(`/api/v1/organizations/${organizationId}/projects/${projectId}`, {
      method: "PUT",
      tenant,
      body
    }),

  listWorkspaces: (tenant: TenantSelection) =>
    request<WorkspaceSummary[]>("/api/v1/workspaces", { tenant }),
  createWorkspace: (
    tenant: TenantSelection,
    body: { id?: string; name: string; description?: string }
  ) =>
    request<WorkspaceSummary>("/api/v1/workspaces", { method: "POST", tenant, body }),
  getWorkspace: (tenant: TenantSelection, workspaceId: string) =>
    request<WorkspaceSummary>(`/api/v1/workspaces/${workspaceId}`, { tenant }),
  updateWorkspace: (
    tenant: TenantSelection,
    workspaceId: string,
    body: { name?: string; description?: string; status?: string }
  ) =>
    request<WorkspaceSummary>(`/api/v1/workspaces/${workspaceId}`, {
      method: "PUT",
      tenant,
      body
    }),
  deleteWorkspace: (tenant: TenantSelection, workspaceId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}`, { method: "DELETE", tenant }),

  listMembers: (
    organizationId: string,
    tenant?: TenantSelection,
    projectId?: string
  ) =>
    request<ScopeMemberSummary[]>(
      `/api/v1/memberships?organization_id=${encodeURIComponent(organizationId)}${
        projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
      }`,
      { tenant }
    ),
  createMembership: (
    organizationId: string,
    body: { user_id: string; role: string },
    tenant?: TenantSelection,
    projectId?: string
  ) =>
    request<ScopeMemberSummary>(
      `/api/v1/memberships?organization_id=${encodeURIComponent(organizationId)}${
        projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
      }`,
      { method: "POST", tenant, body }
    ),
  updateMembership: (
    membershipId: string,
    organizationId: string,
    body: { role: string },
    tenant?: TenantSelection,
    projectId?: string
  ) =>
    request<ScopeMemberSummary>(
      `/api/v1/memberships/${membershipId}?organization_id=${encodeURIComponent(organizationId)}${
        projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
      }`,
      { method: "PATCH", tenant, body }
    ),
  deleteMembership: (
    membershipId: string,
    organizationId: string,
    tenant?: TenantSelection,
    projectId?: string
  ) =>
    request<void>(
      `/api/v1/memberships/${membershipId}?organization_id=${encodeURIComponent(organizationId)}${
        projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
      }`,
      { method: "DELETE", tenant }
    ),

  getEffectivePermissions: (
    organizationId: string,
    tenant?: TenantSelection,
    projectId?: string
  ) =>
    request<EffectivePermissionsSummary>(
      `/api/v1/auth/permissions?organization_id=${encodeURIComponent(organizationId)}${
        projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""
      }`,
      { tenant }
    ),

  listApiKeys: (tenant: TenantSelection) =>
    request<ApiKeySummary[]>(
      `/api/v1/api-keys?organization_id=${encodeURIComponent(tenant.organizationId ?? "")}&project_id=${encodeURIComponent(tenant.projectId ?? "")}`,
      { tenant }
    ),
  createApiKey: (tenant: TenantSelection, body: { name: string }) =>
    request<ApiKeyCreated>("/api/v1/api-keys", {
      method: "POST",
      tenant,
      body: {
        ...body,
        organization_id: tenant.organizationId,
        project_id: tenant.projectId
      }
    }),
  deleteApiKey: (tenant: TenantSelection, apiKeyId: string) =>
    request<void>(`/api/v1/api-keys/${apiKeyId}`, { method: "DELETE", tenant }),

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
    request<ChatSessionSummary[]>(
      `/api/v1/chat/sessions?workspace_id=${encodeURIComponent(tenant.workspaceId ?? "")}`,
      { tenant }
    ),
  createChatSession: (tenant: TenantSelection, body: { title?: string }) =>
    request<ChatSessionSummary>("/api/v1/chat/sessions", { method: "POST", tenant, body }),
  askChatSession: (tenant: TenantSelection, sessionId: string, query: string) =>
    request<ChatMessageSummary>(`/api/v1/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      tenant,
      body: { message: query }
    }),
  listChatMessages: (tenant: TenantSelection, sessionId: string) =>
    request<ChatMessageSummary[]>(`/api/v1/chat/sessions/${sessionId}/messages`, { tenant }),

  // --- Project Documents ---
  listProjectDocuments: (tenant: TenantSelection) =>
    request<ProjectDocumentSummary[]>(`/api/v1/documents?project_id=${encodeURIComponent(tenant.projectId ?? '')}`, { tenant }),

  uploadProjectDocument: (tenant: TenantSelection, file: File, onProgress?: (pct: number) => void) =>
    uploadWithProgress<ProjectDocumentSummary>(
      `/api/v1/documents/upload?project_id=${encodeURIComponent(tenant.projectId ?? '')}`,
      file,
      'file',
      tenant,
      onProgress
    ),

  deleteProjectDocument: (tenant: TenantSelection, documentId: string) =>
    request<void>(`/api/v1/documents/${documentId}?project_id=${encodeURIComponent(tenant.projectId ?? "")}`, {
      method: "DELETE",
      tenant,
    }),

  // --- Workspace Ingestion ---
  ingestProjectFiles: (tenant: TenantSelection, workspaceId: string, documentIds: string[]) =>
    request<RawIngestFilesResponse>(`/api/v1/workspaces/${workspaceId}/ingest-files`, {
      method: "POST",
      tenant,
      body: { document_ids: documentIds }
    }).then((response): IngestFilesResponse => ({
      status: response.status,
      ingestions:
        response.ingestions?.map((result) => ({
          job_id: result.job_id,
          document_id: result.document_id,
          workspace_id: result.workspace_id,
          track_id: result.track_id,
          status: result.status ?? "queued",
          error_message: result.error_message ?? null,
          created_at: result.created_at,
          updated_at: result.updated_at,
          completed_at: result.completed_at ?? null,
        })) ??
        (response.results ?? []).map((result) => ({
          job_id: result.job_id,
          document_id: result.document_id,
          workspace_id: result.workspace_id,
          track_id: result.track_id ?? result.job_id ?? result.document_id,
          status: result.status ?? "queued",
          error_message: result.error_message ?? null,
          created_at: result.created_at,
          updated_at: result.updated_at,
          completed_at: result.completed_at ?? null,
        }))
    })),

  listWorkspaceDocuments: (tenant: TenantSelection, workspaceId: string) =>
    request<RawWorkspaceDocument[]>(`/api/v1/workspaces/${workspaceId}/documents`, { tenant }).then(
      (documents) =>
        documents.map((document) => ({
          ...document,
          status: document.rag_status ?? document.status,
          workspace_id: workspaceId
        }))
    ),

  deleteWorkspaceDocument: (tenant: TenantSelection, workspaceId: string, documentId: string) =>
    request<void>(`/api/v1/workspaces/${workspaceId}/documents/${documentId}`, {
      method: "DELETE",
      tenant,
    }),

  uploadWorkspaceDocument: (tenant: TenantSelection, workspaceId: string, file: File, onProgress?: (pct: number) => void) =>
    uploadWithProgress<WorkspaceUploadResponse>(
      `/api/v1/workspaces/${workspaceId}/documents/upload`,
      file,
      'file',
      tenant,
      onProgress
    ),
};
