"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { useWorkspaceRecord } from "@/lib/local-query";
import type { WorkspaceContextDocumentSelection } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const contextFallback: WorkspaceContextDocumentSelection = {
  workspaceId: "",
  documentIds: []
};

export default function WorkspaceSettingsPageView() {
  const { tenant, workspaces } = useTenant();
  const workspace = workspaces.find((entry) => entry.id === tenant.workspaceId);
  const contextQuery = useWorkspaceRecord(tenant.workspaceId, "context-documents", contextFallback);

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Workspace" title="Settings" />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Workspace" value={workspace?.name ?? tenant.workspaceId ?? "-"} />
          <MetricCard label="Project" value={tenant.projectId ?? "-"} />
          <MetricCard label="Context docs" value={contextQuery.data?.documentIds.length ?? 0} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Workspace details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-white/70 px-4 py-3">
              <span className="text-muted-foreground">Workspace ID</span>
              <span className="font-medium text-slate-950">{workspace?.id ?? tenant.workspaceId}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-white/70 px-4 py-3">
              <span className="text-muted-foreground">Project ID</span>
              <span className="font-medium text-slate-950">{tenant.projectId}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-white/70 px-4 py-3">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium text-slate-950">
                {workspace?.created_at ? formatDate(workspace.created_at) : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-border/70 bg-white/70 px-4 py-3">
              <div className="mb-1 text-muted-foreground">Description</div>
              <div className="font-medium text-slate-950">{workspace?.description || "No description"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WorkspaceGuard>
  );
}
