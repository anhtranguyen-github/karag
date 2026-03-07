import { useState, useEffect, useCallback } from 'react';
import type { Workspace, WorkspaceCreate, WorkspaceUpdate, WorkspaceDetail as APIWorkspaceDetail } from '@/sdk/generated';
import { datasets as datasetsApi } from '@/sdk/datasets';
import { workspaces as workspacesApi } from '@/sdk/workspaces';
import { useError } from '@/context/error-context';
import { isApiStatus, parseApiError, unwrapApiPayload } from '@/lib/api-errors';

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
            const payload = await workspacesApi.list();
            const data = unwrapApiPayload<Workspace[]>(payload);
            const mappedData = data.map((ws: any) => ({
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
            const parsed = await parseApiError(err, "An unexpected error occurred while loading workspaces.");
            showError("Application Error", parsed.message, parsed.details);
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
            const appResponse = await workspacesApi.create({
                requestBody: payload
            });
            const ws = unwrapApiPayload<Workspace>(appResponse);
            const mappedWs = {
                ...ws,
                ragEngine: (ws as any).rag_engine
            } as any;
            await fetchWorkspaces();
            return { success: true, workspace: mappedWs };
        } catch (err: unknown) {
            console.error('Failed to create workspace:', err);
            const parsed = await parseApiError(
                err,
                isApiStatus(err, [409])
                    ? 'A workspace with that name already exists.'
                    : 'System rejected creation request.',
            );
            showError("Unable to Create Workspace", parsed.message, parsed.details);
            return { success: false, error: parsed.message };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        try {
            const updatePayload: WorkspaceUpdate = { name, description };
            await workspacesApi.update({
                workspaceId: id,
                requestBody: updatePayload
            });
            await fetchWorkspaces();
        } catch (err: unknown) {
            console.error('Failed to update workspace:', err);
            const parsed = await parseApiError(err, "Could not save changes.");
            showError("Update Failed", parsed.message, parsed.details);
        }
    };

    const deleteWorkspace = async (id: string, datasetDelete: boolean = false) => {
        try {
            await workspacesApi.delete({
                workspaceId: id,
                datasetDelete: datasetDelete
            });
            if (currentWorkspace?.id === id) {
                localStorage.removeItem('currentWorkspaceId');
            }
            await fetchWorkspaces();
        } catch (err: unknown) {
            console.error('Failed to delete workspace:', err);
            const parsed = await parseApiError(err, 'Unable to delete workspace.');
            showError("Deletion Failed", parsed.message, parsed.details);
        }
    };

    const getWorkspaceDetails = async (id: string): Promise<WorkspaceDetail | null> => {
        try {
            const result = await workspacesApi.getDetails({
                workspaceId: id
            });
            const data = unwrapApiPayload<APIWorkspaceDetail>(result);
            return {
                ...data,
                ragEngine: (data as any).settings?.rag_engine
            } as any;
        } catch (err: unknown) {
            console.error('Failed to fetch workspace details:', err);
            return null;
        }
    };

    const shareDocument = async (sourceName: string, targetWorkspaceId: string) => {
        if (!currentWorkspace) return false;
        try {
            await datasetsApi.shareDocument({
                workspaceId: currentWorkspace.id,
                requestBody: { source_name: sourceName, target_workspace_id: targetWorkspaceId }
            });
            return true;
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
