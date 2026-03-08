"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { MiniBarChart } from "@/components/ui/mini-bar-chart";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { formatDate, toTitleCase } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function ObservabilityPageView() {
  const { tenant } = useTenant();
  const observabilityQuery = useQuery({
    queryKey: ["observability", tenant.workspaceId],
    queryFn: platformApi.observabilitySummary,
    enabled: Boolean(tenant.workspaceId)
  });

  const healthQuery = useQuery({
    queryKey: ["observability", "health"],
    queryFn: platformApi.dependencyHealth
  });

  const workspaceEvents = (observabilityQuery.data?.events ?? []).filter(
    (event) => !tenant.workspaceId || event.workspace_id === tenant.workspaceId
  );
  const workspaceTraces = (observabilityQuery.data?.recent_traces ?? []).filter(
    (trace) => !tenant.workspaceId || trace.workspace_id === tenant.workspaceId
  );

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Inspect request traces, model latency, event emissions, and dependency health from one observability workspace. The UI reads the same OTel-first summary endpoints operators use during incident response."
          eyebrow="Signals"
          title="Observability"
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            hint="Current status reported by the backend dependency health endpoint."
            label="System health"
            value={toTitleCase(healthQuery.data?.status ?? "checking")}
          />
          <MetricCard
            hint="Different trace types currently recorded for this workspace."
            label="Trace types"
            value={new Set(workspaceTraces.map((trace) => trace.trace_type)).size}
          />
          <MetricCard
            hint="Different event types currently emitted for this workspace."
            label="Event types"
            value={new Set(workspaceEvents.map((event) => event.event_type)).size}
          />
          <MetricCard
            hint={`Event bus: ${observabilityQuery.data?.event_bus ?? "unknown"}`}
            label="Recent events"
            value={workspaceEvents.length}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MiniBarChart
            color="emerald"
            title="Trace metrics"
            values={
              workspaceTraces.reduce<Record<string, number>>((accumulator, trace) => {
                accumulator[trace.trace_type] = (accumulator[trace.trace_type] ?? 0) + 1;
                return accumulator;
              }, {})
            }
          />
          <MiniBarChart
            color="amber"
            title="Event metrics"
            values={
              workspaceEvents.reduce<Record<string, number>>((accumulator, event) => {
                accumulator[event.event_type] = (accumulator[event.event_type] ?? 0) + 1;
                return accumulator;
              }, {})
            }
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
                render: (row) => row.workspace_id ?? "global"
              },
              {
                key: "time",
                header: "Occurred",
                render: (row) => formatDate(row.occurred_at)
              }
            ]}
            description="Event stream emitted through the internal event bus for the active workspace."
            rows={workspaceEvents}
            title="Recent events"
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent traces</CardTitle>
              <CardDescription>
                Captured traces are redacted by default and linked back to pipeline or dataset resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workspaceTraces.map((trace) => (
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
    </WorkspaceGuard>
  );
}
