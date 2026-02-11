import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    stats?: {
        thread_count: number;
        doc_count: number;
    }
}

export interface Thread {
    id: string;
    title?: string;
    updated_at?: string;
}

export interface DocumentRef {
    id: string;
    filename: string;
    chunks?: number;
}

export interface WorkspaceDetail extends Workspace {
    threads: Thread[];
    documents: DocumentRef[];
}

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACES);
            if (!res.ok) {
                const data = await res.json();
                showError("Connection Failed", "Unable to load your workspaces. Please check your network connection.", undefined);
                return;
            }
            const data = await res.json();
            setWorkspaces(data);

            const savedWsId = localStorage.getItem('currentWorkspaceId');
            const found = data.find((ws: Workspace) => ws.id === savedWsId);
            if (found) {
                setCurrentWorkspace(found);
            } else {
                // Primary fallback: look for 'default' workspace
                const defaultWs = data.find((ws: Workspace) => ws.id === 'default');
                if (defaultWs) {
                    setCurrentWorkspace(defaultWs);
                    localStorage.setItem('currentWorkspaceId', defaultWs.id);
                } else if (data.length > 0) {
                    // Secondary fallback: first available workspace
                    setCurrentWorkspace(data[0]);
                    localStorage.setItem('currentWorkspaceId', data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch workspaces:', err);
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const selectWorkspace = (ws: Workspace) => {
        setCurrentWorkspace(ws);
        localStorage.setItem('currentWorkspaceId', ws.id);
    };

    const validateWorkspaceName = (name: string) => {
        if (!name.trim()) return "Workspace name cannot be empty.";
        const illegalChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '[', ']', '{', '}', '(', ')', ';', '&', '$', '#', '@', '!'];
        const found = illegalChars.filter(c => name.includes(c));
        if (found.length > 0) {
            return `Workspace name contains invalid characters: ${found.join(' ')}. Please use only letters, numbers, underscores, and hyphens.`;
        }
        return null;
    };

    const createWorkspace = async (payload: { name: string; description?: string; rag_engine?: string }) => {
        // Optimistic Validation (UX Immediacy)
        const validationError = validateWorkspaceName(payload.name);
        if (validationError) {
            showError("Invalid Input", validationError);
            return { success: false, error: validationError };
        }

        try {
            const res = await fetch(API_ROUTES.WORKSPACES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                await fetchWorkspaces();
                return { success: true, workspace: data.data };
            } else {
                // Structured Error Handling (Code-based contract)
                let title = "Unable to Create Workspace";
                let message = data.message || data.detail || "System rejected creation request.";

                switch (data.code) {
                    case "DUPLICATE_NAME":
                        title = "Name Unavailable";
                        message = "A workspace with this name already exists.";
                        break;
                    case "INVALID_NAME":
                        title = "Invalid Name Format";
                        break;
                    case "VALIDATION_ERROR":
                        title = "Input Validation Error";
                        break;
                    default:
                        if (res.status >= 500) {
                            title = "Server Failure";
                            message = "The infrastructure encountered an error while initializing the workspace.";
                        }
                }

                showError(title, message, data.data ? JSON.stringify(data.data) : (data.params ? JSON.stringify(data.params) : undefined));
                return { success: false, error: message };
            }
        } catch (err) {
            console.error('Failed to create workspace:', err);
            showError("Network Error", "Handshake failed. The intelligence hub is currently unreachable.");
            return { success: false, error: 'Connection error' };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        // Optimistic Validation
        const validationError = validateWorkspaceName(name);
        if (validationError) {
            showError("Invalid Input", validationError);
            return;
        }

        try {
            const res = await fetch(API_ROUTES.WORKSPACE_DETAIL(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();

            if (res.ok) {
                await fetchWorkspaces();
            } else {
                let title = "Update Failed";
                let message = data.detail || 'Unable to update workspace settings.';

                if (data.code === "CONFLICT_ERROR") {
                    title = "Name Conflict";
                    message = "Another workspace is already using this name.";
                } else if (data.code === "VALIDATION_ERROR") {
                    title = "Invalid Name";
                    message = data.detail;
                }

                showError(title, message);
            }
        } catch (err) {
            showError("Connection Error", "Could not save changes. Handshake failed during synchronization.");
            console.error('Failed to update workspace:', err);
        }
    };

    const deleteWorkspace = async (id: string, vaultDelete: boolean = false) => {
        try {
            const res = await fetch(`${API_ROUTES.WORKSPACE_DETAIL(id)}?vault_delete=${vaultDelete}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                if (currentWorkspace?.id === id) {
                    localStorage.removeItem('currentWorkspaceId');
                }
                await fetchWorkspaces();
            } else {
                const data = await res.json();
                showError("Deletion Failed", data.detail || 'Unable to delete workspace.');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            showError("Connection Error", "Could not delete workspace. Please check your connection.");
            console.error('Failed to delete workspace:', err);
        }
    };

    const getWorkspaceDetails = async (id: string): Promise<WorkspaceDetail | null> => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACE_STATS(id));
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch workspace details:', err);
            return null;
        }
    };

    const shareDocument = async (sourceName: string, targetWorkspaceId: string) => {
        if (!currentWorkspace) return;
        try {
            const res = await fetch(API_ROUTES.WORKSPACE_SHARE(currentWorkspace.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_name: sourceName, target_workspace_id: targetWorkspaceId })
            });
            return res.ok;
        } catch (err) {
            console.error('Failed to share document:', err);
            return false;
        }
    };

    return {
        workspaces,
        currentWorkspace,
        isLoading,
        error: null, // errors are shown via modal
        selectWorkspace,
        switchWorkspace: selectWorkspace, // alias for layout
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        getWorkspaceDetails,
        shareDocument,
        refreshWorkspaces: fetchWorkspaces
    };
}
