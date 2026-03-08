"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { useWorkspaceRecord } from "@/lib/local-query";
import type { WorkspaceContextDocumentSelection } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

const contextFallback: WorkspaceContextDocumentSelection = {
  workspaceId: "",
  documentIds: []
};

export default function WorkspaceOverviewPageView() {
  const { tenant, workspaces } = useTenant();
  const workspace = workspaces.find((entry) => entry.id === tenant.workspaceId);
  const contextQuery = useWorkspaceRecord(tenant.workspaceId, "context-documents", contextFallback);

  const knowledgeDatasetsQuery = useQuery({
    queryKey: ["workspace-overview", "knowledge-datasets", tenant.workspaceId],
    queryFn: () => platformApi.listKnowledgeDatasets(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  const ragConfigQuery = useQuery({
    queryKey: ["workspace-rag-config", tenant.workspaceId],
    queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Workspace" title={workspace?.name ?? "Workspace"} />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Context docs" value={contextQuery.data?.documentIds.length ?? 0} />
          <MetricCard label="Datasets" value={knowledgeDatasetsQuery.data?.length ?? 0} />
          <MetricCard label="Vector store" value={ragConfigQuery.data?.vector_store_type ?? "qdrant"} />
          <MetricCard label="Model" value={ragConfigQuery.data?.llm_config.model ?? "gpt-4o-mini"} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href={generateWorkspaceUrl(tenant.workspaceId!, "chat")}>
                Open chat
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Context docs</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href={generateWorkspaceUrl(tenant.workspaceId!, "context-docs")}>
                Manage docs
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>RAG Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href={generateWorkspaceUrl(tenant.workspaceId!, "rag")}>
                Open settings
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}
