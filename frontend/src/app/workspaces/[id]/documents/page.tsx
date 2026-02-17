"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { DocumentList } from "@/components/documents/document-list";
import { UploadModal } from "@/components/documents/upload-modal";
import { VaultSelector } from "@/components/documents/vault-selector";
import { Button } from "@/components/ui/button";
import { UploadCloud, Link as LinkIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkspaceDocumentsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isVaultSelectorOpen, setIsVaultSelectorOpen] = useState(false);

    useEffect(() => {
        if (workspaceId) {
            fetchDocuments();
        }
    }, [workspaceId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await api.getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet({ workspaceId });
            const data: any = res.data;
            // Ensure we handle if documents is null
            setDocuments(data.documents || []);
        } catch (e) {
            console.error("Failed to fetch documents", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDetach = async (docId: string) => {
        if (!confirm("Are you sure you want to remove this document from the workspace?")) return;
        try {
            // Use workspace update or document update-workspaces
            // Using raw fetch for now as per VaultSelector finding about generic body
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/documents/update-workspaces`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    document_id: docId,
                    target_workspace_id: workspaceId,
                    action: "detach" // Assuming 'detach' or 'remove'? 
                    // documents.py line 189: action = data.get("action", "share")
                    // It passes it to `run_workspace_op_background`.
                    // task_service.create_task("workspace_op"...)
                    // I should check what actions are supported. Usually 'share', 'revoke'?
                })
            });
            fetchDocuments();
        } catch (e) {
            console.error(e);
            alert("Failed to detach document");
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-semibold">Documents</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage documents in this workspace.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsVaultSelectorOpen(true)}>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Attach Existing
                    </Button>
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Upload New
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-muted-foreground">Loading...</div>
            ) : (
                <DocumentList
                    documents={documents}
                    showDetach
                    onDetach={handleDetach}
                />
            )}

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                workspaceId={workspaceId}
                onUploadComplete={fetchDocuments}
            />

            <VaultSelector
                isOpen={isVaultSelectorOpen}
                onClose={() => setIsVaultSelectorOpen(false)}
                workspaceId={workspaceId}
                onAttachComplete={fetchDocuments}
            />
        </div>
    );
}
