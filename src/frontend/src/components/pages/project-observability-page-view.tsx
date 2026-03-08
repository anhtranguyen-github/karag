"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { MiniBarChart } from "@/components/ui/mini-bar-chart";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { formatDate, toTitleCase } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectObservabilityPageView() {
  const { tenant, workspaces } = useTenant();
  const observabilityQuery = useQuery({
    queryKey: ["project-observability", tenant.organizationId, tenant.projectId],
    queryFn: platformApi.observabilitySummary,
    enabled: Boolean(tenant.organizationId && tenant.projectId)
  });

  const healthQuery = useQuery({
    queryKey: ["project-observability", "health"],
    queryFn: platformApi.dependencyHealth
  });

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const projectEvents = (observabilityQuery.data?.events ?? []).filter(
    (event) => !event.workspace_id || workspaceIds.has(event.workspace_id)
  );
  const projectTraces = (observabilityQuery.data?.recent_traces ?? []).filter(
    (trace) => trace.project_id === tenant.projectId
  );

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Observability lives at the project layer because it spans document ingestion, runtime requests, integrations, and every workspace inside the project."
          eyebrow="Project"
          title="Observability"
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard hint="Current system status from the dependency health endpoint." label="System health" value={toTitleCase(healthQuery.data?.status ?? "checking")} />
          <MetricCard hint="Workspaces contributing telemetry to this project." label="Active workspaces" value={workspaces.length} />
          <MetricCard hint="Different trace types currently captured for this project." label="Trace types" value={new Set(projectTraces.map((trace) => trace.trace_type)).size} />
          <MetricCard hint={`Event bus: ${observabilityQuery.data?.event_bus ?? "unknown"}`} label="Recent events" value={projectEvents.length} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MiniBarChart
            color="emerald"
            title="Project trace volume"
            values={projectTraces.reduce<Record<string, number>>((accumulator, trace) => {
              accumulator[trace.trace_type] = (accumulator[trace.trace_type] ?? 0) + 1;
              return accumulator;
            }, {})}
          />
          <MiniBarChart
            color="sky"
            title="Project event volume"
            values={projectEvents.reduce<Record<string, number>>((accumulator, event) => {
              accumulator[event.event_type] = (accumulator[event.event_type] ?? 0) + 1;
              return accumulator;
            }, {})}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <DataTable
            columns={[
              {
                key: "event",
                header: "Event",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{toTitleCase(row.event_type)}</div>
                    <div className="text-xs text-muted-foreground">{row.resource_id}</div>
                  </div>
                )
              },
              {
                key: "workspace",
                header: "Workspace",
                render: (row) => row.workspace_id ?? "project"
              },
              {
                key: "time",
                header: "Occurred",
                render: (row) => formatDate(row.occurred_at)
              }
            ]}
            description="Event stream for the selected project and its workspaces."
            rows={projectEvents}
            title="Project events"
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent traces</CardTitle>
              <CardDescription>
                Redacted-by-default traces linked to project runs and runtime activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectTraces.slice(0, 8).map((trace) => (
                <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={trace.trace_id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{toTitleCase(trace.trace_type)}</div>
                      <div className="text-xs text-muted-foreground">{trace.trace_id}</div>
                    </div>
                    <Badge variant="muted">{trace.status}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {Object.entries(trace.metrics).map(([key, value]) => (
                      <div key={key}>
                        {toTitleCase(key)}: {value}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </ProjectGuard>
  );
}
