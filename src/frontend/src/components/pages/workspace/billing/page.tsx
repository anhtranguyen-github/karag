"use client";

import { useQuery } from "@tanstack/react-query";

import { FeaturePage } from "@/components/ui/feature-page";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceBillingPage() {
  const { tenant } = useTenant();
  const workspaceQuery = useQuery({
    queryKey: ["workspace", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.getWorkspace(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.organizationId && tenant.projectId && tenant.workspaceId),
  });
  const dependencyHealthQuery = useQuery({
    queryKey: ["dependency-health"],
    queryFn: platformApi.dependencyHealth,
  });

  return (
    <WorkspaceGuard>
      <FeaturePage
        scopeLabel="Workspace"
        title="Workspace Ownership"
        subtitle="Live runtime summary for this workspace from the current backend deployment."
        highlights={[
          { label: "Workspace", value: workspaceQuery.data?.status ?? "unknown" },
          { label: "Vector Store", value: dependencyHealthQuery.data?.providers.vector_store ?? "unknown" },
          { label: "LLM", value: dependencyHealthQuery.data?.providers.llm_provider ?? "unknown" },
        ]}
      />
    </WorkspaceGuard>
  );
}
