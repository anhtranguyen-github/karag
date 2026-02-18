"use client";

import { useParams } from "next/navigation";
import { SettingsManager } from "@/components/settings-manager";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Settings, Shield, Loader2 } from "lucide-react";

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { workspaces, isLoading } = useWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto h-full">
                    <SettingsManager workspaceId={workspaceId} />
                </div>
            </main>
        </div>
    );
}
