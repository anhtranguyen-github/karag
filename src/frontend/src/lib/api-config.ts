const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
        // In production/Vercel, use the /api/v1 prefix on the same host
        if (process.env.NODE_ENV === 'production' || window.location.hostname.includes('vercel.app')) {
            return '/api/v1';
        }
        return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ROUTES = {
    // Auth
    AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
    AUTH_REGISTER: `${API_BASE_URL}/auth/register`,

    // Workspace-scoped routes
    CHAT_STREAM: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/stream`,
    CHAT_HISTORY: (workspaceId: string, threadId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/history/${encodeURIComponent(threadId)}`,
    CHAT_THREADS: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/threads`,
    THREAD_TITLE: (workspaceId: string, threadId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/threads/${encodeURIComponent(threadId)}/title`,
    THREAD_GET: (workspaceId: string, threadId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/threads/${encodeURIComponent(threadId)}`,
    THREAD_DELETE: (workspaceId: string, threadId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/chat/threads/${encodeURIComponent(threadId)}`,

    DOCUMENTS: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/documents`,
    DOCUMENTS_ALL: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/documents-all`,
    DOCUMENTS_UPDATE_WS: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/documents/update-workspaces`,
    VAULT: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/vault`,
    DOCUMENT_GET: (workspaceId: string, id: string) => `${API_BASE_URL}/workspaces/${workspaceId}/documents/${encodeURIComponent(id)}`,
    DOCUMENT_DELETE: (workspaceId: string, id: string) => `${API_BASE_URL}/workspaces/${workspaceId}/documents/${encodeURIComponent(id)}`,
    UPLOAD: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/upload`,

    SETTINGS: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/settings/`,
    SETTINGS_METADATA: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/settings/metadata`,

    SEARCH: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/search`,
    TASKS: (workspaceId: string) => `${API_BASE_URL}/workspaces/${workspaceId}/tasks/`,
    TASK_STATUS: (workspaceId: string, id: string) => `${API_BASE_URL}/workspaces/${workspaceId}/tasks/${encodeURIComponent(id)}`,

    // Global routes
    WORKSPACES: `${API_BASE_URL}/workspaces`,
    WORKSPACE_DETAIL: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}`,
    WORKSPACE_STATS: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}/details`,
    WORKSPACE_SHARE: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}/share-document`,

    METRICS: `${API_BASE_URL}/metrics`,
    EVAL_DATASETS: `${API_BASE_URL}/eval/datasets`,
    EVAL_RUNS: `${API_BASE_URL}/eval/runs`,
    EVAL_RUN_DETAIL: (id: string) => `${API_BASE_URL}/eval/runs/${encodeURIComponent(id)}`,
    ADMIN_PROMPTS: `${API_BASE_URL}/admin/prompts`,
    ADMIN_VECTOR_STATUS: `${API_BASE_URL}/admin/vector/status`,
    ADMIN_OPS_OVERVIEW: `${API_BASE_URL}/admin/ops/overview`,
};

export const EXTERNAL_SERVICES = {
    JAEGER: process.env.NEXT_PUBLIC_JAEGER_URL || 'http://localhost:16686',
    PROMETHEUS: process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090',
};
