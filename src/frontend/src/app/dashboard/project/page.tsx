"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectLandingPage() {
    const router = useRouter();
    const { tenant, isReady, projects } = useTenant();

    useEffect(() => {
        if (isReady) {
            if (tenant.projectId) {
                router.replace(`/dashboard/project/${tenant.projectId}`);
            } else if (projects.length > 0) {
                router.replace(`/dashboard/project/${projects[0].id}`);
            } else {
                // If no projects found, redirect to creation page
                router.replace("/dashboard/new/project");
            }
        }
    }, [isReady, tenant.projectId, projects, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="text-sm font-medium text-slate-500 animate-pulse">
                    Loading project overview...
                </div>
            </div>
        </div>
    );
}
