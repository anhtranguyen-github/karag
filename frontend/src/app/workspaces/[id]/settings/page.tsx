"use client";

import { useParams } from "next/navigation";
import { SettingsManager } from "@/components/settings-manager";

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent">
            <main className="flex-1 flex flex-col relative h-full">
                <div className="w-full h-full">
                    <SettingsManager workspaceId={workspaceId} />
                </div>
            </main>
        </div>
    );
}
