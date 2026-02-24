"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Trash2 } from "lucide-react";
import { Workspace } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DeleteWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (vaultDelete: boolean) => void | Promise<void>;
    workspace: Workspace | null;
}

export function DeleteWorkspaceModal({
    isOpen,
    onClose,
    onConfirm,
    workspace,
}: DeleteWorkspaceModalProps) {
    const [vaultDelete, setVaultDelete] = useState(false);

    if (!workspace) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-2">
                    <Trash2 size={16} className="text-muted-foreground" />
                    <span className="text-foreground">Delete Workspace</span>
                </div>
            )}
            className="max-w-md"
        >
            <div className="flex flex-col gap-5 pt-2">
                <p className="text-xs text-muted-foreground">
                    This action is irreversible. What would you like to delete?
                </p>

                <div className="flex flex-col gap-2">
                    <label className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        !vaultDelete ? "bg-secondary text-foreground border-border" : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/50"
                    )}>
                        <input
                            type="radio"
                            className="accent-foreground"
                            checked={!vaultDelete}
                            onChange={() => setVaultDelete(false)}
                        />
                        <span className="text-sm font-bold">Workspace only</span>
                    </label>

                    <label className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        vaultDelete ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/50"
                    )}>
                        <input
                            type="radio"
                            className="accent-red-500"
                            checked={vaultDelete}
                            onChange={() => setVaultDelete(true)}
                        />
                        <span className="text-sm font-bold">Workspace and its documents</span>
                    </label>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(vaultDelete);
                            setVaultDelete(false); // Reset state for next time
                        }}
                        className={cn(
                            "px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-sm",
                            vaultDelete ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20"
                        )}
                    >
                        {vaultDelete ? "Delete workspace & documents" : "Delete workspace"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

