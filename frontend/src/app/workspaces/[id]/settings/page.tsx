"use client";

import { useParams } from "next/navigation";
import { SettingsManager } from "@/components/settings-manager";

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-[1440px] mx-auto h-full">
                    <SettingsManager workspaceId={workspaceId} />
                </div>
            </main>
        </div>
    );
}
