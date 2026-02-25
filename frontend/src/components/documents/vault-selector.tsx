"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { Check, Database, Loader2, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultDocument {
    id: string;
    name: string;
    created_at?: string;
    size?: number;
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
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchVault();
        }
    }, [isOpen]);

    const fetchVault = async () => {
        setLoading(true);
        try {
            const payload = await api.listVaultDocumentsWorkspacesWorkspaceIdVaultGet({
                workspaceId: workspaceId!
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDocuments((payload.data as any[]) || []);
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

    const executeAttach = async () => {
        setLoading(true);
        try {
            const promises = Array.from(selectedIds).map(docId =>
                api.updateDocumentWorkspacesWorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
                    workspaceId: workspaceId,
                    documentWorkspaceUpdate: {
                        documentId: docId,
                        targetWorkspaceId: workspaceId,
                        action: "share"
                    }
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

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <Database size={16} />
                    </div>
                    <span>Collective Vault</span>
                </div>
            )}
            className="max-w-2xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col h-[600px]">
                <div className="px-8 pt-2 pb-6">
                    <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" />
                        <input
                            type="text"
                            placeholder="Search shared knowledge..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 bg-secondary/40 border border-border rounded-xl pl-12 pr-4 text-[11px] font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 space-y-2 custom-scrollbar">
                    {loading && documents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Querying Vault...</span>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30 italic">
                            <span className="text-xs">No matching documents found in the vault.</span>
                        </div>
                    ) : (
                        filteredDocs.map(doc => {
                            const isSelected = selectedIds.has(doc.id);
                            return (
                                <div
                                    key={doc.id}
                                    onClick={() => toggleSelection(doc.id)}
                                    className={cn(
                                        "group flex items-center p-4 rounded-2xl border transition-all cursor-pointer",
                                        isSelected
                                            ? "bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20"
                                            : "bg-secondary/20 border-border hover:border-indigo-500/20 hover:bg-secondary/40"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-lg border-2 mr-4 flex items-center justify-center transition-all",
                                        isSelected
                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "bg-card border-border group-hover:border-indigo-500/30"
                                    )}>
                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors mr-4">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-bold text-foreground truncate">{doc.name}</div>
                                        <div className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-black mt-1">
                                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown Epoch'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-8 mt-4 border-t border-border bg-secondary/20 flex items-center justify-between gap-6 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Selection Count</span>
                        <span className="text-xs font-bold text-foreground">{selectedIds.size} Assets Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-11 px-6 rounded-xl border border-border text-[9px] font-black tracking-widest uppercase hover:bg-white/5 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeAttach}
                            disabled={loading || selectedIds.size === 0}
                            className="h-11 px-8 rounded-xl bg-indigo-500 text-white text-[9px] font-black tracking-widest uppercase hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Link To Environment
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
