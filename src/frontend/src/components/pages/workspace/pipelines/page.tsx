"use client";

import { Save } from "lucide-react";

import { ConfigForm } from "@/components/config/config-form";
import { LegacyRouteRedirect } from "@/components/routing/legacy-route-redirect";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { pipelineFormDefinition } from "@/lib/form-definitions";
import { useUpsertWorkspaceCollection, useWorkspaceCollection } from "@/lib/local-query";
import type { PipelineConfig } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function PipelinesPageView() {
  const { tenant } = useTenant();
  const pipelinesQuery = useWorkspaceCollection<PipelineConfig>(tenant.workspaceId, "pipelines");
  const savePipeline = useUpsertWorkspaceCollection<PipelineConfig>(tenant.workspaceId, "pipelines");

  const pipelines = pipelinesQuery.data ?? [];

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Define workspace-scoped pipeline presets for retrieval behavior, chunking strategy, and reranking. These typed configs are intentionally isolated from dataset creation so operators can standardize runtime behavior."
          eyebrow="Runtime configuration"
          title="Pipelines"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            hint="Profiles available for this workspace."
            label="Saved pipelines"
            value={pipelines.length}
          />
          <MetricCard
            hint="Profiles currently marked active."
            label="Enabled pipelines"
            value={pipelines.filter((pipeline) => pipeline.enabled).length}
          />
          <MetricCard
            hint="The default retrieval depth across active profiles."
            label="Average top-k"
            value={
              pipelines.length
                ? (
                    pipelines.reduce((sum, pipeline) => sum + pipeline.topK, 0) / pipelines.length
                  ).toFixed(1)
                : "0"
            }
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create or update pipeline</CardTitle>
              <CardDescription>
                All pipeline knobs are schema-driven so the same component set can power future backend-backed config endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={pipelineFormDefinition}
                onSubmit={async (values) => {
                  await savePipeline.mutateAsync({
                    ...values,
                    id: crypto.randomUUID(),
                    workspaceId: tenant.workspaceId!,
                    createdAt: new Date().toISOString()
                  });
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <DataTable
            actions={
              <Button variant="outline">
                <Save className="h-4 w-4" />
                Workspace profile store
              </Button>
            }
            columns={[
              {
                key: "pipeline",
                header: "Pipeline",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.embeddingModel}</div>
                  </div>
                )
              },
              {
                key: "retrieval",
                header: "Retrieval",
                render: (row) => (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Retriever: {row.retriever}</div>
                    <div>Reranker: {row.reranker}</div>
                  </div>
                )
              },
              {
                key: "limits",
                header: "Chunking",
                render: (row) => (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Chunk size: {row.chunkSize}</div>
                    <div>Top K: {row.topK}</div>
                  </div>
                )
              },
              {
                key: "state",
                header: "State",
                render: (row) => (
                  <Badge variant={row.enabled ? "success" : "warning"}>
                    {row.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                )
              },
              {
                key: "created",
                header: "Saved",
                render: (row) => formatDate(row.createdAt)
              }
            ]}
            description="These pipeline profiles are stored per workspace and designed to map cleanly onto future server-side pipeline definitions."
            rows={pipelines}
            title="Saved pipeline profiles"
          />
        </section>
      </div>
    </WorkspaceGuard>
  );
}

