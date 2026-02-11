const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ROUTES = {
    CHAT_STREAM: `${API_BASE_URL}/chat/stream`,
    CHAT_HISTORY: (threadId: string) => `${API_BASE_URL}/chat/history/${encodeURIComponent(threadId)}`,
    CHAT_THREADS: `${API_BASE_URL}/chat/threads`,
    THREAD_TITLE: (threadId: string) => `${API_BASE_URL}/chat/threads/${encodeURIComponent(threadId)}/title`,
    THREAD_DELETE: (threadId: string) => `${API_BASE_URL}/chat/threads/${encodeURIComponent(threadId)}`,
    DOCUMENTS: `${API_BASE_URL}/documents`,
    DOCUMENTS_ALL: `${API_BASE_URL}/documents-all`,
    DOCUMENTS_UPDATE_WS: `${API_BASE_URL}/documents/update-workspaces`,
    VAULT: `${API_BASE_URL}/vault`,
    DOCUMENT_GET: (name: string) => `${API_BASE_URL}/documents/${encodeURIComponent(name)}`,
    DOCUMENT_DELETE: (name: string) => `${API_BASE_URL}/documents/${encodeURIComponent(name)}`,
    UPLOAD: `${API_BASE_URL}/upload`,
    SETTINGS: `${API_BASE_URL}/settings/`,
    SETTINGS_METADATA: `${API_BASE_URL}/settings/metadata`,
    TOOLS: `${API_BASE_URL}/tools/`,
    TOOL_TOGGLE: (id: string) => `${API_BASE_URL}/tools/${encodeURIComponent(id)}/toggle`,
    WORKSPACES: `${API_BASE_URL}/workspaces`,
    WORKSPACE_DETAIL: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}`,
    WORKSPACE_STATS: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}/details`,
    WORKSPACE_SHARE: (id: string) => `${API_BASE_URL}/workspaces/${encodeURIComponent(id)}/share-document`,
    SEARCH: `${API_BASE_URL}/search`,
    TASKS: `${API_BASE_URL}/tasks/`,
    TASK_STATUS: (id: string) => `${API_BASE_URL}/tasks/${encodeURIComponent(id)}`,
};
