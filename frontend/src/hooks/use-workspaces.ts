import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useError } from '@/context/error-context';
import { Workspace, WorkspaceCreate, WorkspaceUpdate } from '@/lib/api';
export type { Workspace, WorkspaceCreate, WorkspaceUpdate };

export interface WorkspaceExtended extends Workspace {
    llmProvider?: string | null;
    embeddingProvider?: string | null;
    ragEngine?: string | null;
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

export interface WorkspaceDetail extends WorkspaceExtended {
    threads: Thread[];
    documents: DocumentRef[];
}

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<WorkspaceExtended[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceExtended | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchWorkspaces = useCallback(async () => {
        try {
            const payload = await api.listWorkspacesWorkspacesGet();

            if (!payload.success || !payload.data) {
                showError(payload.code || "Error", payload.message || "Failed to load workspaces.");
                return;
            }

            const mappedData = payload.data.map(ws => ({
                ...ws,
                llmProvider: ws.llmProvider,
                embeddingProvider: ws.embeddingProvider,
                ragEngine: ws.ragEngine
            }));

            setWorkspaces(mappedData);

            const savedWsId = localStorage.getItem('currentWorkspaceId');
            const found = mappedData.find(ws => ws.id === savedWsId);
            if (found) {
                setCurrentWorkspace(found);
            } else if (mappedData.length > 0) {
                setCurrentWorkspace(mappedData[0]);
                localStorage.setItem('currentWorkspaceId', mappedData[0].id);
            } else {
                setCurrentWorkspace(null);
            }
        } catch (err: any) {
            console.error('Failed to fetch workspaces:', err);
            showError("Application Error", "An unexpected error occurred while loading workspaces.");
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const selectWorkspace = (ws: WorkspaceExtended) => {
        setCurrentWorkspace(ws);
        localStorage.setItem('currentWorkspaceId', ws.id);
    };

    const createWorkspace = async (payload: WorkspaceCreate) => {
        try {
            const appResponse = await api.createWorkspaceWorkspacesPost({
                workspaceCreate: payload
            });

            if (appResponse.success && appResponse.data) {
                const ws = appResponse.data;
                const mappedWs = {
                    ...ws,
                    llmProvider: ws.llmProvider,
                    embeddingProvider: ws.embeddingProvider,
                    ragEngine: ws.ragEngine
                };
                await fetchWorkspaces();
                return { success: true, workspace: mappedWs };
            } else {
                let title = "Unable to Create Workspace";
                const message = appResponse.message || "System rejected creation request.";
                showError(title, message, JSON.stringify(appResponse.data));
                return { success: false, error: message };
            }
        } catch (err: any) {
            console.error('Failed to create workspace:', err);
            showError("Network Error", "Handshake failed. The intelligence hub is currently unreachable.");
            return { success: false, error: 'Connection error' };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        try {
            const updatePayload: WorkspaceUpdate = { name, description };
            const appResponse = await api.updateWorkspaceWorkspacesWorkspaceIdPatch({
                workspaceId: id,
                workspaceUpdate: updatePayload
            });

            if (appResponse.success) {
                await fetchWorkspaces();
            } else {
                showError("Update Failed", appResponse.message || "Could not save changes.");
            }
        } catch (err: any) {
            showError("Connection Error", "Could not save changes. Handshake failed during synchronization.");
            console.error('Failed to update workspace:', err);
        }
    };

    const deleteWorkspace = async (id: string, vaultDelete: boolean = false) => {
        try {
            const appResponse = await api.deleteWorkspaceWorkspacesWorkspaceIdDelete({
                workspaceId: id,
                vaultDelete: vaultDelete
            });

            if (appResponse.success) {
                if (currentWorkspace?.id === id) {
                    localStorage.removeItem('currentWorkspaceId');
                }
                await fetchWorkspaces();
            } else {
                showError("Deletion Failed", appResponse.message || 'Unable to delete workspace.');
            }
        } catch (err: any) {
            showError("Connection Error", "Could not delete workspace. Please check your connection.");
            console.error('Failed to delete workspace:', err);
        }
    };

    const getWorkspaceDetails = async (id: string): Promise<WorkspaceDetail | null> => {
        try {
            const result = await api.getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet({
                workspaceId: id
            });
            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (err: any) {
            console.error('Failed to fetch workspace details:', err);
            return null;
        }
    };

    const shareDocument = async (sourceName: string, targetWorkspaceId: string) => {
        if (!currentWorkspace) return;
        try {
            // shareDocument endpoint doesn't seem to have a dedicated generated method in api object?
            // Actually it was in WorkspacesApi. let's check.
            // based on workspaces.py, it's @router.post("/{workspace_id}/share-document")
            const response = await api.shareDocumentWorkspacesWorkspaceIdShareDocumentPost({
                workspaceId: currentWorkspace.id,
                // shareDocument payload is source_name and target_workspace_id
                body: { source_name: sourceName, target_workspace_id: targetWorkspaceId }
            } as any); // Type cast if needed, but checking source it should be there.
            return response.success;
        } catch (err: any) {
            console.error('Failed to share document:', err);
            return false;
        }
    };

    return {
        workspaces,
        currentWorkspace,
        isLoading,
        error: null,
        selectWorkspace,
        switchWorkspace: selectWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        getWorkspaceDetails,
        shareDocument,
        refreshWorkspaces: fetchWorkspaces
    };
}
