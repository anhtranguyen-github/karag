"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { FeaturePage } from "@/components/ui/feature-page";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationBillingPage() {
  const { tenant } = useTenant();
  const organizationsQuery = useQuery({
    queryKey: ["organizations", tenant.actorId],
    queryFn: () => platformApi.listOrganizations({ actorId: tenant.actorId }),
    enabled: Boolean(tenant.actorId),
  });
  const organization = (organizationsQuery.data ?? []).find((item) => item.id === tenant.organizationId);

  const projectsQuery = useQuery({
    queryKey: ["projects", tenant.organizationId, tenant.actorId],
    queryFn: () => platformApi.listProjects(tenant.organizationId!, { actorId: tenant.actorId }),
    enabled: Boolean(tenant.organizationId),
  });

  const workspaceQueries = useQueries({
    queries: (projectsQuery.data ?? []).map((project) => ({
      queryKey: ["workspaces", tenant.organizationId, project.id, tenant.actorId],
      queryFn: () =>
        platformApi.listWorkspaces({
          organizationId: tenant.organizationId,
          projectId: project.id,
          actorId: tenant.actorId,
        }),
      enabled: Boolean(tenant.organizationId && tenant.actorId),
    })),
  });

  const workspaceCount = workspaceQueries.reduce((total, query) => total + (query.data?.length ?? 0), 0);

  return (
    <OrganizationGuard>
      <FeaturePage
        scopeLabel="Organization"
        title="Deployment Ownership"
        subtitle="Live organization and infrastructure summary sourced from the current backend state."
        highlights={[
          { label: "Organization", value: organization?.status ?? "unknown" },
          { label: "Projects", value: String(projectsQuery.data?.length ?? 0) },
          { label: "Workspaces", value: String(workspaceCount) },
        ]}
      />
    </OrganizationGuard>
  );
}
