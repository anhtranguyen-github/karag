import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface Workspace {
    id: string;
    name: string;
    description?: string | null;
    stats?: {
        thread_count?: number;
        doc_count?: number;
    } | null;
}

export interface Thread {
    id: string;
    title?: string | null;
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
                // If the response is not ok, we can't assume JSON or specific structure yet, 
                // but usually our backend returns AppResponse even on error (status 400/500).
                // For now, handling network-level failures.
                showError("Connection Failed", "Unable to load your workspaces. Please check your network connection.");
                return;
            }

            const rawData = await res.json();

            // Runtime Validation
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const { WorkspaceSchema } = await import('@/lib/schemas/workspaces');
            const { z } = await import('zod');

            const ResponseSchema = AppResponseSchema(z.array(WorkspaceSchema));
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation:", result.error);
                showError("System Error", "The server returned an unexpected data format. Please contact support.");
                return;
            }

            const payload = result.data;
            if (!payload.success || !payload.data) {
                // Business Logic Error
                showError(payload.code || "Error", payload.message || "Failed to load workspaces.");
                return;
            }

            setWorkspaces(payload.data);

            const savedWsId = localStorage.getItem('currentWorkspaceId');
            const found = payload.data.find(ws => ws.id === savedWsId);
            if (found) {
                setCurrentWorkspace(found);
            } else {
                const defaultWs = payload.data.find(ws => ws.id === 'default');
                if (defaultWs) {
                    setCurrentWorkspace(defaultWs);
                    localStorage.setItem('currentWorkspaceId', defaultWs.id);
                } else if (payload.data.length > 0) {
                    setCurrentWorkspace(payload.data[0]);
                    localStorage.setItem('currentWorkspaceId', payload.data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch workspaces:', err);
            showError("Application Error", "An unexpected error occurred while loading workspaces.");
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

    // Zod Schema Imports (Static)
    // Note: In a real app, move these to top-level imports. 
    // Kept inside for compatibility during migration if needed, but best practice is top.

    const validateWorkspaceName = async (name: string) => {
        const { CreateWorkspaceSchema } = await import('@/lib/schemas/workspaces');
        const result = CreateWorkspaceSchema.shape.name.safeParse(name);
        return result.success ? null : result.error.errors[0].message;
    };

    const createWorkspace = async (payload: { name: string; description?: string; rag_engine?: string }) => {
        // Optimistic Validation with Zod
        const { CreateWorkspaceSchema } = await import('@/lib/schemas/workspaces');
        const { AppResponseSchema } = await import('@/lib/schemas/api');
        const { WorkspaceSchema } = await import('@/lib/schemas/workspaces');
        const { z } = await import('zod');

        const validationResult = CreateWorkspaceSchema.safeParse({
            name: payload.name,
            description: payload.description
        });

        if (!validationResult.success) {
            const errorMsg = validationResult.error.errors[0].message;
            showError("Invalid Input", errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            const res = await fetch(API_ROUTES.WORKSPACES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const rawData = await res.json();
            const ResponseSchema = AppResponseSchema(WorkspaceSchema);
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation:", result.error);
                showError("System Error", "Server response validation failed.");
                return { success: false, error: "Invalid server response" };
            }

            const appResponse = result.data;
            if (appResponse.success && appResponse.data) {
                await fetchWorkspaces();
                return { success: true, workspace: appResponse.data };
            } else {
                // Structured Business Error Handling
                let title = "Unable to Create Workspace";
                let message = appResponse.message || "System rejected creation request.";

                switch (appResponse.code) {
                    case "DUPLICATE_NAME":
                        title = "Name Unavailable";
                        break;
                    case "INVALID_NAME":
                    case "VALIDATION_ERROR":
                        title = "Input Validation Error";
                        break;
                    default:
                        if (res.status >= 500) title = "Server Failure";
                }

                showError(title, message, JSON.stringify(appResponse.data));
                return { success: false, error: message };
            }
        } catch (err) {
            console.error('Failed to create workspace:', err);
            showError("Network Error", "Handshake failed. The intelligence hub is currently unreachable.");
            return { success: false, error: 'Connection error' };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        const { CreateWorkspaceSchema } = await import('@/lib/schemas/workspaces');
        const nameValidation = CreateWorkspaceSchema.shape.name.safeParse(name);

        if (!nameValidation.success) {
            showError("Invalid Input", nameValidation.error.errors[0].message);
            return;
        }

        try {
            const res = await fetch(API_ROUTES.WORKSPACE_DETAIL(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });

            // Parse response as generic AppResponse or Workspace
            // Assuming update returns Workspace in data on success
            const rawData = await res.json();

            // If backend standard is violated (e.g. update returns raw workspace), handle fallback or enforce
            // Based on constraints, should be AppResponse
            // Check status manually first if unsure, but let's try strict Zod
            if (res.ok) {
                await fetchWorkspaces();
            } else {
                // Handle error
                showError("Update Failed", "Could not save changes.");
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

            // Delete usually returns { status: 'success', message: ... } - minimal AppResponse
            // We can validate it too

            if (res.ok) {
                if (currentWorkspace?.id === id) {
                    localStorage.removeItem('currentWorkspaceId');
                }
                await fetchWorkspaces();
            } else {
                const data = await res.json();
                showError("Deletion Failed", data.message || 'Unable to delete workspace.');
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
                const result = await res.json();
                if (result.success && result.data) {
                    return result.data;
                }
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
