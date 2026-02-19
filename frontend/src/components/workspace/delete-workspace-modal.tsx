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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Workspace"
            className="max-w-md"
        >
            <div className="flex flex-col gap-4 -mt-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p className="text-[11px] font-medium leading-tight">
                        Permanently delete <span className="font-bold">"{workspace.name}"</span>?
                        This wipes all vectors and history.
                    </p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 rounded-xl h-10 text-[10px] font-black tracking-widest uppercase hover:bg-white/5"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-[2] rounded-xl h-10 text-[10px] font-black tracking-widest uppercase bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/10"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Deleting
                            </>
                        ) : (
                            "Confirm Purge"
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
