"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { tenant, isReady } = useTenant();

  useEffect(() => {
    if (isReady) {
      if (tenant.organizationId) {
        router.replace(`/dashboard/org/${tenant.organizationId}`);
      } else {
        // Fallback if no orgs found
        router.replace("/dashboard/new/org");
      }
    }
  }, [isReady, tenant.organizationId, router]);

  if (isReady) {
    return null;
  }

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="text-sm font-medium text-slate-500 animate-pulse">
          Setting up your workspace...
        </div>
      </div>
    </div>
  );
}
