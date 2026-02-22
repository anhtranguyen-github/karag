"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Workspace } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DeleteWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (vaultDelete: boolean) => Promise<void>;
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
    const [vaultDelete, setVaultDelete] = useState(false);

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
                            Depending on your choice below, documents will either be returned to the vault or completely purged.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 px-2">
                        <label className={cn(
                            "flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                            !vaultDelete ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/50" : "bg-secondary/40 border-border hover:bg-secondary"
                        )}>
                            <input
                                type="radio"
                                className="mt-1"
                                checked={!vaultDelete}
                                onChange={() => setVaultDelete(false)}
                            />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-foreground">Workspace Only</span>
                                <span className="text-xs text-muted-foreground">Removes the workspace, but leaves all documents securely in the global vault.</span>
                            </div>
                        </label>

                        <label className={cn(
                            "flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                            vaultDelete ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/50" : "bg-secondary/40 border-border hover:bg-secondary"
                        )}>
                            <input
                                type="radio"
                                className="mt-1 accent-red-500"
                                checked={vaultDelete}
                                onChange={() => setVaultDelete(true)}
                            />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-red-500">Purge Documents</span>
                                <span className="text-xs text-muted-foreground">Deletes the workspace and permanently purges its documents from the vault unless they are used elsewhere.</span>
                            </div>
                        </label>
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
                        onClick={() => onConfirm(vaultDelete)}
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
