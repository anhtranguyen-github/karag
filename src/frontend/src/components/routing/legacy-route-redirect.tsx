"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import {
  buildOrgPath,
  generateProjectUrl,
  generateWorkspaceUrl,
  getLegacyProjectSection,
  getLegacyWorkspaceSection
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export function LegacyRouteRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, isReady } = useTenant();

  const projectSection = getLegacyProjectSection(pathname);
  const workspaceSection = getLegacyWorkspaceSection(pathname);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (projectSection && tenant.projectId) {
      router.replace(generateProjectUrl(tenant.projectId, projectSection));
      return;
    }

    if (workspaceSection && tenant.workspaceId) {
      router.replace(generateWorkspaceUrl(tenant.workspaceId, workspaceSection));
      return;
    }

    router.replace(buildOrgPath());
  }, [isReady, projectSection, router, tenant.projectId, tenant.workspaceId, workspaceSection]);

  return <EmptyState description="Redirecting to the current route." title="Redirecting" />;
}
