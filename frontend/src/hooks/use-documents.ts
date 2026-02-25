import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useError } from '@/context/error-context';

export interface DocumentPoint {
    id: string;
    payload: Record<string, unknown>;
}

export interface Document {
    id: string;
    filename: string;
    name: string;      // Compatibility field from backend facade
    extension: string; // Compatibility field
    workspace_id: string;
    content_hash: string;
    rag_config_hash?: string | null;
    status: string;
    chunks?: number | null;
    shared_with: string[];
    created_at: string;
    updated_at: string;
    // Derived/Optional fields
    is_shared?: boolean;
    workspace_name?: string;
    points?: DocumentPoint[];
}

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchDocuments = useCallback(async () => {
        try {
            setIsLoading(true);
            const payload = await api.listAllDocumentsWorkspacesWorkspaceIdDocumentsAllGet({
                workspaceId: "vault" // Global view uses vault context
            });

            if (payload.success && payload.data) {
                setDocuments(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch all documents:', err);
            showError("Connection Error", "Intelligence vault link offline.");
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const deleteDocument = async (name: string, workspaceId: string, vaultDelete: boolean = false) => {
        try {
            const payload = await api.deleteDocumentWorkspacesWorkspaceIdDocumentsDocumentIdDelete({
                documentId: name,
                workspaceId: workspaceId,
                vaultDelete
            });
            if (payload.success) {
                await fetchDocuments();
                return true;
            } else {
                showError("Purge Failed", payload.message || "Unable to remove document from sector.");
            }
        } catch (err: any) {
            console.error('Failed to delete document:', err);
            try {
                const payload = await err.response.json();
                showError("Purge Failed", payload.message || "Transmission lost during purge request.");
            } catch (e) {
                showError("Network Error", "Transmission lost during purge request.");
            }
        }
        return false;
    };

    const updateWorkspaceAction = async (name: string, workspaceId: string, targetWorkspaceId: string, action: 'move' | 'share' | 'unshare', forceReindex: boolean = false) => {
        try {
            const payload = await api.updateDocumentWorkspacesWorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
                workspaceId: workspaceId,
                documentWorkspaceUpdate: {
                    documentId: name,
                    targetWorkspaceId: targetWorkspaceId,
                    action: action as any,
                    forceReindex
                }
            });

            if (payload.success) {
                await fetchDocuments();
                return { success: true };
            }

            showError("Orchestration Failed", payload.message || "Unable to complete document transfer.");
        } catch (err: any) {
            console.error(`Failed to ${action} document:`, err);
            try {
                const data = await err.response.json();
                if (data.code === "CONFLICT_ERROR") {
                    return { success: false, conflict: true, error: data.message || data.detail };
                }
                showError("Orchestration Failed", data.message || data.detail || "Unable to complete document transfer.");
            } catch (e) {
                showError("Network Error", "Handshake failed during data translocation.");
            }
        }
        return { success: false };
    };

    const inspectDocument = async (name: string, workspaceId: string) => {
        try {
            const payload = await api.inspectDocumentWorkspacesWorkspaceIdDocumentsDocumentIdInspectGet({
                documentId: name,
                workspaceId
            });
            if (payload.success && payload.data) {
                return payload.data;
            }
        } catch (err) {
            console.error('Failed to inspect document:', err);
            showError("Scan Failed", "Unable to retrieve low-level segment data.");
        }
        return null;
    };

    return {
        documents,
        isLoading,
        refreshDocuments: fetchDocuments,
        deleteDocument,
        updateWorkspaceAction,
        inspectDocument
    };
}
