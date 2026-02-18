"use client";

import { useParams } from "next/navigation";
import { KnowledgeBase } from "@/components/knowledge-base";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { FileText, Shield, Loader2 } from "lucide-react";

export default function WorkspaceDocumentsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { workspaces, isLoading } = useWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
            <main className="flex-1 overflow-hidden p-12">
                <div className="h-full max-w-6xl mx-auto">
                    <KnowledgeBase workspaceId={workspaceId} />
                </div>
            </main>
        </div>
    );
}
