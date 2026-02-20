"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultDocument {
    id: string;
    name: string;
    created_at?: string;
}

export function VaultSelector({
    isOpen,
    onClose,
    workspaceId,
    onAttachComplete
}: {
    isOpen: boolean,
    onClose: () => void,
    workspaceId: string,
    onAttachComplete?: () => void
}) {
    const [documents, setDocuments] = useState<VaultDocument[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchVault();
        }
    }, [isOpen]);

    const fetchVault = async () => {
        setLoading(true);
        try {
            // Get all vault docs
            const res = await api.listVaultDocumentsVaultGet();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDocuments((res.data as any[]) || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };



    // Override the attach call with correct fetch
    const executeAttach = async () => {
        setLoading(true);
        try {
            const promises = Array.from(selectedIds).map(docId =>
                fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/documents/update-workspaces`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        document_id: docId,
                        target_workspace_id: workspaceId,
                        action: "share"
                    })
                })
            );
            await Promise.all(promises);

            if (onAttachComplete) onAttachComplete();
            onClose();
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Attach from Vault">
            <div className="py-2 h-[400px] flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 p-1">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => toggleSelection(doc.id)}
                            className={cn(
                                "flex items-center p-3 border rounded-lg cursor-pointer transition-colors",
                                selectedIds.has(doc.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded border mr-3 flex items-center justify-center",
                                selectedIds.has(doc.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                            )}>
                                {selectedIds.has(doc.id) && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="font-medium truncate">{doc.name}</div>
                                <div className="text-xs text-muted-foreground">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown date'}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t flex justify-end">
                    <Button onClick={executeAttach} disabled={loading || selectedIds.size === 0}>
                        {loading ? "Attaching..." : `Attach ${selectedIds.size} Documents`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
