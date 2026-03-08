"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationLandingPage() {
    const router = useRouter();
    const { tenant, isReady, organizations } = useTenant();

    useEffect(() => {
        if (isReady) {
            if (tenant.organizationId) {
                router.replace(`/dashboard/org/${tenant.organizationId}`);
            } else if (organizations.length > 0) {
                router.replace(`/dashboard/org/${organizations[0].id}`);
            } else {
                // If still no org, redirect to creation page
                router.replace("/dashboard/new/org");
            }
        }
    }, [isReady, tenant.organizationId, organizations, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="text-sm font-medium text-slate-500 animate-pulse">
                    Loading organization overview...
                </div>
            </div>
        </div>
    );
}
