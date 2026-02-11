import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface DocumentPoint {
    id: string;
    payload: Record<string, unknown>;
}

export interface Document {
    id: string;
    name: string;
    extension: string;
    workspace_id: string;
    shared_with: string[];
    chunks: number;
    status?: string;
    points: DocumentPoint[];
}

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchDocuments = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(API_ROUTES.DOCUMENTS_ALL);
            if (!res.ok) {
                showError("Retrieval Failed", "The system could not load the global document vault.");
                return;
            }
            const rawData = await res.json();

            // Runtime Validation
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const { DocumentSchema } = await import('@/lib/schemas/documents');
            const { z } = await import('zod');

            const ResponseSchema = AppResponseSchema(z.array(DocumentSchema));
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation (Documents):", result.error);
                return;
            }

            const payload = result.data;
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
            const url = new URL(API_ROUTES.DOCUMENT_DELETE(name));
            url.searchParams.append('workspace_id', workspaceId);
            url.searchParams.append('vault_delete', String(vaultDelete));
            const res = await fetch(url.toString(), {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchDocuments();
                return true;
            } else {
                const data = await res.json();
                showError("Purge Failed", data.detail || "Unable to remove document from sector.");
            }
        } catch (err) {
            console.error('Failed to delete document:', err);
            showError("Network Error", "Transmission lost during purge request.");
        }
        return false;
    };

    const updateWorkspaceAction = async (name: string, workspaceId: string, targetWorkspaceId: string, action: 'move' | 'share' | 'unshare', forceReindex: boolean = false) => {
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    workspace_id: workspaceId,
                    target_workspace_id: targetWorkspaceId,
                    action,
                    force_reindex: forceReindex
                })
            });
            const data = await res.json();

            if (res.ok) {
                await fetchDocuments();
                return { success: true };
            }

            if (data.code === "CONFLICT_ERROR") {
                // Incompatible configuration or state conflict
                return { success: false, conflict: true, error: data.detail };
            } else {
                showError("Orchestration Failed", data.detail || "Unable to complete document transfer.");
            }
        } catch (err) {
            console.error(`Failed to ${action} document:`, err);
            showError("Network Error", "Handshake failed during data translocation.");
        }
        return { success: false };
    };

    const inspectDocument = async (name: string) => {
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(name)}/inspect`);
            if (res.ok) {
                return await res.json();
            } else {
                showError("Scan Failed", "Unable to retrieve low-level segment data.");
            }
        } catch (err) {
            console.error('Failed to inspect document:', err);
            showError("Connection Error", "Data probe failed.");
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
