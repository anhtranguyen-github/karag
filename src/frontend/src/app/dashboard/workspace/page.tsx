"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceLandingPage() {
    const router = useRouter();
    const { tenant, isReady, workspaces } = useTenant();

    useEffect(() => {
        if (isReady) {
            if (tenant.workspaceId) {
                router.replace(`/dashboard/workspace/${tenant.workspaceId}`);
            } else if (workspaces.length > 0) {
                router.replace(`/dashboard/workspace/${workspaces[0].id}`);
            } else {
                // If no workspaces found, redirect to creation page
                router.replace("/dashboard/new/workspace");
            }
        }
    }, [isReady, tenant.workspaceId, workspaces, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="text-sm font-medium text-slate-500 animate-pulse">
                    Loading workspace...
                </div>
            </div>
        </div>
    );
}
