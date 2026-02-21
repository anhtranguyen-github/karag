"use client";

import { Modal } from "@/components/ui/modal";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Workspace } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DeleteWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    workspace: Workspace | null;
    isDeleting: boolean;
}

export function DeleteWorkspaceModal({
    isOpen,
    onClose,
    onConfirm,
    workspace,
    isDeleting
}: DeleteWorkspaceModalProps) {
    if (!workspace) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <Trash2 size={16} />
                    </div>
                    <span>Destructive Action</span>
                </div>
            )}
            className="max-w-md"
        >
            <div className="flex flex-col gap-6 pt-2">
                <div className="space-y-4">
                    <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Purge Environment Configuration</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black opacity-60">
                                This action is irreversible
                            </p>
                        </div>
                    </div>

                    <div className="px-2">
                        <p className="text-xs text-muted-foreground leading-relaxed text-center">
                            You are about to permanently delete <span className="font-bold text-foreground">"{workspace.name}"</span>.
                            This will wipe all vector indexes, stored documents, and thread history associated with this node.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-2xl bg-secondary border border-border text-[9px] font-black tracking-[0.2em] uppercase hover:bg-secondary/80 transition-all active:scale-95"
                    >
                        Abort
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={cn(
                            "flex-[1.5] h-12 rounded-2xl bg-red-500 text-white text-[9px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95",
                            isDeleting ? "opacity-50" : "hover:bg-red-600"
                        )}
                    >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isDeleting ? "Purging..." : "Confirm Purge"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
