"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { DataTable } from "@/components/tables/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { formatDate, toTitleCase } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectLogsPageView() {
  const { tenant, workspaces } = useTenant();
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const observabilityQuery = useQuery({
    queryKey: ["project-logs", tenant.organizationId, tenant.projectId],
    queryFn: platformApi.observabilitySummary,
    enabled: Boolean(tenant.organizationId && tenant.projectId)
  });

  const filteredEvents = useMemo(() => {
    return (observabilityQuery.data?.events ?? []).filter((event) => {
      const belongsToProject = !event.workspace_id || workspaces.some((workspace) => workspace.id === event.workspace_id);
      const matchesWorkspace =
        workspaceFilter === "all" || event.workspace_id === workspaceFilter;
      return belongsToProject && matchesWorkspace;
    });
  }, [observabilityQuery.data?.events, workspaceFilter, workspaces]);

  const filteredTraces = useMemo(() => {
    return (observabilityQuery.data?.recent_traces ?? []).filter((trace) => {
      const belongsToProject = trace.project_id === tenant.projectId;
      const matchesWorkspace =
        workspaceFilter === "all" || trace.workspace_id === workspaceFilter;
      return belongsToProject && matchesWorkspace;
    });
  }, [observabilityQuery.data?.recent_traces, tenant.projectId, workspaceFilter]);

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Logs stay at the project level because most operational debugging spans uploads, providers, and multiple workspaces."
          eyebrow="Project"
          title="Logs"
        />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DataTable
            actions={
              <div className="min-w-[240px]">
                <SelectDropdown
                  label="Workspace filter"
                  onChange={(event) => setWorkspaceFilter(event.target.value)}
                  options={[
                    { label: "All workspaces", value: "all" },
                    ...workspaces.map((workspace) => ({
                      label: workspace.name,
                      value: workspace.id
                    }))
                  ]}
                  value={workspaceFilter}
                />
              </div>
            }
            columns={[
              {
                key: "type",
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
            description="Operational events for the selected project."
            rows={filteredEvents}
            title="Event log"
          />

          <Card>
            <CardHeader>
              <CardTitle>Trace log</CardTitle>
              <CardDescription>
                Recent distributed traces filtered to the selected project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTraces.slice(0, 10).map((trace) => (
                <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={trace.trace_id}>
                  <div className="font-medium text-slate-900">{toTitleCase(trace.trace_type)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{trace.trace_id}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Workspace: {trace.workspace_id ?? "project"} | Status: {trace.status} | {formatDate(trace.created_at)}
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
