"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { TextInput } from "@/components/inputs/text-input";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useSaveWorkspaceRecord, useWorkspaceRecord } from "@/lib/local-query";
import type { WorkspaceContextDocumentSelection } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const contextFallback: WorkspaceContextDocumentSelection = {
  workspaceId: "",
  documentIds: []
};

export default function WorkspaceContextDocumentsPageView() {
  const queryClient = useQueryClient();
  const { tenant, workspaces } = useTenant();
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const contextQuery = useWorkspaceRecord(tenant.workspaceId, "context-documents", contextFallback);
  const saveContext = useSaveWorkspaceRecord<WorkspaceContextDocumentSelection>(
    tenant.workspaceId,
    "context-documents"
  );

  const datasetQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["workspace-context", "datasets", tenant.projectId, workspace.id],
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

  const datasets = useMemo(() => datasetQueries.flatMap((query) => query.data ?? []), [datasetQueries]);

  const documentQueries = useQueries({
    queries: datasets.map((dataset) => ({
      queryKey: ["workspace-context", "documents", dataset.id],
      queryFn: () =>
        platformApi.listDatasetDocuments(
          {
            ...tenant,
            workspaceId: dataset.workspace_id
          },
          dataset.id
        )
    }))
  });

  const selectedIds = contextQuery.data?.documentIds ?? [];
  const datasetNameMap = useMemo(() => new Map(datasets.map((dataset) => [dataset.id, dataset.name])), [datasets]);
  const workspaceNameMap = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])), [workspaces]);

  const documents = useMemo(() => {
    return documentQueries
      .flatMap((query) => query.data ?? [])
      .map((document) => ({
        ...document,
        datasetName: datasetNameMap.get(document.dataset_id) ?? document.dataset_id,
        workspaceName: workspaceNameMap.get(document.workspace_id) ?? document.workspace_id
      }))
      .filter((document) => {
        const matchesSearch = [document.title, document.datasetName, document.workspaceName]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesWorkspace =
          workspaceFilter === "all" || document.workspace_id === workspaceFilter;
        return matchesSearch && matchesWorkspace;
      });
  }, [datasetNameMap, documentQueries, search, workspaceFilter, workspaceNameMap]);

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Documents belong to the project, not the workspace. This page lets the workspace choose which project documents should shape chat behavior and testing."
          eyebrow="Workspace"
          title="Context docs"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Selected docs" value={selectedIds.length} />
          <MetricCard label="Datasets" value={datasets.length} />
          <MetricCard label="Storage" value="Project" />
        </section>

        <DataTable
          actions={
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[240px]">
                <TextInput
                  label="Search documents"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search document, dataset, or workspace"
                  value={search}
                />
              </div>
              <div className="min-w-[220px]">
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
            </div>
          }
          columns={[
            {
              key: "select",
              header: "",
              className: "w-[56px]",
              render: (row) => (
                <input
                  checked={selectedIds.includes(row.id)}
                  onChange={async (event) => {
                    const nextIds = event.target.checked
                      ? [...selectedIds, row.id]
                      : selectedIds.filter((value) => value !== row.id);

                    await saveContext.mutateAsync({
                      workspaceId: tenant.workspaceId!,
                      documentIds: nextIds
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ["workspace-local-record", "context-documents", tenant.workspaceId]
                    });
                  }}
                  type="checkbox"
                />
              )
            },
            {
              key: "document",
              header: "Document",
              render: (row) => (
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{row.datasetName}</div>
                </div>
              )
            },
            {
              key: "workspace",
              header: "Owned by workspace",
              render: (row) => row.workspaceName
            },
            {
              key: "created",
              header: "Created",
              render: (row) => formatDate(row.created_at)
            }
          ]}
          description="Select docs."
          rows={documents}
          title="Project documents"
        />

        <div className="flex justify-end">
          <Button
            onClick={async () => {
              await saveContext.mutateAsync({
                workspaceId: tenant.workspaceId!,
                documentIds: selectedIds
              });
            }}
            type="button"
          >
            Save selection
          </Button>
        </div>
      </div>
    </WorkspaceGuard>
  );
}
