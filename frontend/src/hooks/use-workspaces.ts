import { useState, useEffect, useCallback } from 'react';
import { api, type Workspace, type WorkspaceCreate } from '@/lib/api-client';
import { useError } from '@/context/error-context';
import type { WorkspaceUpdate, WorkspaceDetail as APIWorkspaceDetail } from '@/client/types.gen';

export type { Workspace, WorkspaceCreate, WorkspaceUpdate };

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
    settings?: any;
    ragEngine?: string | null;
}

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchWorkspaces = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = await api.listWorkspacesApiV1WorkspacesGet();

            if (!payload.success || !payload.data) {
                showError(payload.code || "Error", payload.message || "Failed to load workspaces.");
                return;
            }

            const mappedData = payload.data.map((ws: any) => ({
                ...ws,
                ragEngine: ws.rag_engine
            }));

            setWorkspaces(mappedData);

            const savedWsId = localStorage.getItem('currentWorkspaceId');
            const found = mappedData.find((ws: Workspace) => ws.id === savedWsId);
            if (found) {
                setCurrentWorkspace(found);
            } else if (mappedData.length > 0) {
                const first = mappedData[0];
                setCurrentWorkspace(first);
                localStorage.setItem('currentWorkspaceId', first.id);
            } else {
                setCurrentWorkspace(null);
            }
        } catch (err: unknown) {
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

    const createWorkspace = async (payload: WorkspaceCreate) => {
        try {
            const appResponse = await api.createWorkspaceApiV1WorkspacesPost({
                requestBody: payload
            });

            if (appResponse.success && appResponse.data) {
                const ws = appResponse.data;
                const mappedWs = {
                    ...ws,
                    ragEngine: (ws as any).rag_engine
                } as any;
                await fetchWorkspaces();
                return { success: true, workspace: mappedWs };
            } else {
                const title = "Unable to Create Workspace";
                const message = (appResponse as any).message || "System rejected creation request.";
                showError(title, message, JSON.stringify(appResponse.data));
                return { success: false, error: message };
            }
        } catch (err: unknown) {
            console.error('Failed to create workspace:', err);
            showError("Network Error", "Handshake failed. The intelligence hub is currently unreachable.");
            return { success: false, error: 'Connection error' };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        try {
            const updatePayload: WorkspaceUpdate = { name, description };
            const appResponse = await api.updateWorkspaceApiV1WorkspacesWorkspaceIdPatch({
                workspaceId: id,
                requestBody: updatePayload
            });

            if (appResponse.success) {
                await fetchWorkspaces();
            } else {
                showError("Update Failed", (appResponse as any).message || "Could not save changes.");
            }
        } catch (err: unknown) {
            showError("Connection Error", "Could not save changes. Handshake failed during synchronization.");
            console.error('Failed to update workspace:', err);
        }
    };

    const deleteWorkspace = async (id: string, datasetDelete: boolean = false) => {
        try {
            const appResponse = await api.deleteWorkspaceApiV1WorkspacesWorkspaceIdDelete({
                workspaceId: id,
                datasetDelete: datasetDelete
            });

            if (appResponse.success) {
                if (currentWorkspace?.id === id) {
                    localStorage.removeItem('currentWorkspaceId');
                }
                await fetchWorkspaces();
            } else {
                showError("Deletion Failed", (appResponse as any).message || 'Unable to delete workspace.');
            }
        } catch (err: unknown) {
            showError("Connection Error", "Could not delete workspace. Please check your connection.");
            console.error('Failed to delete workspace:', err);
        }
    };

    const getWorkspaceDetails = async (id: string): Promise<WorkspaceDetail | null> => {
        try {
            const result = await api.getWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGet({
                workspaceId: id
            });
            if (result.success && result.data) {
                const data = result.data as APIWorkspaceDetail;
                return {
                    ...data,
                    ragEngine: data.settings?.rag_engine
                } as WorkspaceDetail;
            }
            return null;
        } catch (err: unknown) {
            console.error('Failed to fetch workspace details:', err);
            return null;
        }
    };

    const shareDocument = async (sourceName: string, targetWorkspaceId: string) => {
        if (!currentWorkspace) return false;
        try {
            const response = await api.shareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPost({
                workspaceId: currentWorkspace.id,
                requestBody: { source_name: sourceName, target_workspace_id: targetWorkspaceId }
            });
            return response.success;
        } catch (err: unknown) {
            console.error('Failed to share document:', err);
            return false;
        }
    };

    return {
        workspaces,
        currentWorkspace,
        isLoading,
        fetchWorkspaces,
        selectWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        getWorkspaceDetails,
        shareDocument
    };
}
