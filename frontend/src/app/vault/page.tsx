"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { DocumentList } from "@/components/documents/document-list";
import { UploadModal } from "@/components/documents/upload-modal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UploadCloud } from "lucide-react";

export default function VaultPage() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await api.listVaultDocumentsVaultGet();
            setDocuments((res.data as any[]) || []);
        } catch (e) {
            console.error("Failed to fetch documents", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Are you sure you want to delete this document globally? This cannot be undone.")) return;
        try {
            // api.deleteDocumentDocumentsDocumentIdDelete({ documentId: docId, vaultDelete: true });
            await api.deleteDocumentDocumentsDocumentIdDelete({ documentId: docId, vaultDelete: true });
            fetchDocuments();
        } catch (e) {
            console.error(e);
            alert("Failed to delete document");
        }
    };

    return (
        <div className="container mx-auto max-w-4xl py-12 px-4 h-full overflow-y-auto">
            <div className="flex items-center mb-8">
                <Link href="/" className="mr-4 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
                    <p className="text-muted-foreground mt-1">
                        Global document repository.
                    </p>
                </div>
                <Button onClick={() => setIsUploadModalOpen(true)}>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload
                </Button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <DocumentList
                    documents={documents}
                    showDelete
                    onDelete={handleDelete}
                />
            )}

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                workspaceId="vault"
                onUploadComplete={fetchDocuments}
            />
        </div>
    );
}
