"use client";

import { useQuery } from "@tanstack/react-query";

import { FeaturePage } from "@/components/ui/feature-page";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectIntegrationsPage() {
  const { tenant } = useTenant();
  const projectQuery = useQuery({
    queryKey: ["project", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.getProject(tenant, tenant.organizationId!, tenant.projectId!),
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
        title="Integrations"
        subtitle="Current integration surface for this project, derived from configured storage and active platform providers."
        highlights={[
          { label: "Storage", value: projectQuery.data?.document_storage_config.provider ?? "unknown" },
          { label: "Storage Endpoint", value: projectQuery.data?.document_storage_config.endpoint ?? "unset" },
          { label: "Providers", value: dependencyHealthQuery.data?.status ?? "unknown" },
        ]}
      />
    </ProjectGuard>
  );
}
