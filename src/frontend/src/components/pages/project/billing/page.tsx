"use client";

import { useQuery } from "@tanstack/react-query";

import { FeaturePage } from "@/components/ui/feature-page";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectBillingPage() {
  const { tenant } = useTenant();
  const projectQuery = useQuery({
    queryKey: ["project", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.getProject(tenant, tenant.organizationId!, tenant.projectId!),
    enabled: Boolean(tenant.organizationId && tenant.projectId),
  });
  const workspacesQuery = useQuery({
    queryKey: ["workspaces", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listWorkspaces(tenant),
    enabled: Boolean(tenant.organizationId && tenant.projectId),
  });
  const dependencyHealthQuery = useQuery({
    queryKey: ["dependency-health"],
    queryFn: platformApi.dependencyHealth,
  });

  return (
    <ProjectGuard>
      <FeaturePage
        scopeLabel="Project"
        title="Project Ownership"
        subtitle="Live infrastructure summary for this project, derived from backend project configuration and platform health."
        highlights={[
          { label: "Storage", value: projectQuery.data?.document_storage_config.provider ?? "unknown" },
          { label: "Workspaces", value: String(workspacesQuery.data?.length ?? 0) },
          { label: "Event Bus", value: dependencyHealthQuery.data?.providers.event_bus ?? "unknown" },
        ]}
      />
    </ProjectGuard>
  );
}
