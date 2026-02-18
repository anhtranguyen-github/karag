"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Workspace } from "@/lib/api";

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
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Workspace">
            <div className="flex flex-col gap-6 p-1">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                    <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-widest">Permanent Action</h4>
                        <p className="text-xs font-medium leading-relaxed opacity-80">
                            You are about to delete <span className="font-bold underline">"{workspace.name}"</span>.
                            This will permanently remove all associated documents, chat history, and vector embeddings. This action cannot be undone.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Are you absolutely sure?</p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 rounded-xl h-12 text-xs font-black tracking-widest uppercase"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-[2] rounded-xl h-12 text-xs font-black tracking-widest uppercase shadow-lg shadow-destructive/20"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Confirm Deletion"
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
