"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/tables/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { formatCount, formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectOverviewPageView() {
  const { tenant, projects, workspaces } = useTenant();
  const selectedProject = projects.find((project) => project.id === tenant.projectId);

  const datasetQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["project-overview", "datasets", workspace.id],
      queryFn: () =>
        platformApi.listKnowledgeDatasets(
          {
            ...tenant,
            workspaceId: workspace.id
          },
          workspace.id
        )
    }))
  });

  const modelsQuery = useQuery({
    queryKey: ["project-overview", "models", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listModels(tenant),
    enabled: Boolean(tenant.organizationId && tenant.projectId)
  });

  const observabilityQuery = useQuery({
    queryKey: ["project-overview", "observability"],
    queryFn: platformApi.observabilitySummary
  });

  const datasets = datasetQueries.flatMap((query) => query.data ?? []);
  const projectEvents = (observabilityQuery.data?.events ?? []).filter(
    (event) => !event.workspace_id || workspaces.some((workspace) => workspace.id === event.workspace_id)
  );

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="This is the main functional unit of the platform. Manage project storage, integrations, workspaces, and operations from here, then drop into a workspace only when you want to operate a specific assistant."
          eyebrow="Project"
          title={selectedProject?.name ?? "Project overview"}
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Workspaces" value={workspaces.length} />
          <MetricCard label="Datasets" value={datasets.length} />
          <MetricCard label="Documents" value={formatCount(datasets.reduce((sum, dataset) => sum + dataset.document_count, 0))} />
          <MetricCard label="Models" value={modelsQuery.data?.length ?? 0} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <DataTable
            columns={[
              {
                key: "workspace",
                header: "Workspace",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.id}</div>
                  </div>
                )
              },
              {
                key: "datasets",
                header: "Datasets",
                render: (row) => datasets.filter((dataset) => dataset.workspace_id === row.id).length
              },
              {
                key: "documents",
                header: "Documents",
                render: (row) =>
                  formatCount(
                    datasets
                      .filter((dataset) => dataset.workspace_id === row.id)
                      .reduce((sum, dataset) => sum + dataset.document_count, 0)
                  )
              },
              {
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.created_at)
              }
            ]}
            description="Project workspaces."
            rows={workspaces}
            title="Workspaces"
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Event stream entries touching this project or one of its workspaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectEvents.slice(0, 8).map((event) => (
                <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={`${event.event_type}-${event.occurred_at}-${event.resource_id}`}>
                  <div className="font-medium text-slate-900">{event.event_type}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{event.resource_id}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDate(event.occurred_at)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </ProjectGuard>
  );
}
