"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UploadCloud, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ConfigForm } from "@/components/config/config-form";
import { FileUpload } from "@/components/inputs/file-upload";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { TextInput } from "@/components/inputs/text-input";
import { LegacyRouteRedirect } from "@/components/routing/legacy-route-redirect";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { knowledgeDatasetFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { KnowledgeDatasetDetail } from "@/lib/types/platform";
import { formatCount, formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const uploadSchema = z.object({
  datasetId: z.string().min(1, "Choose a dataset."),
  file: z.custom<File | null>((value) => value instanceof File, {
    message: "Choose a file to upload."
  })
});

type UploadValues = z.infer<typeof uploadSchema>;

type ProjectKnowledgeDataset = KnowledgeDatasetDetail & {
  workspaceName: string;
};

export default function ProjectDocumentsPageView() {
  const { tenant, workspaces } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "completed" | "failed">(
    "idle"
  );

  const workspaceNameMap = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces]
  );

  useEffect(() => {
    if (!targetWorkspaceId && workspaces.length) {
      setTargetWorkspaceId(workspaces[0].id);
    }
  }, [targetWorkspaceId, workspaces]);

  const datasetQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["knowledge-datasets", tenant.organizationId, tenant.projectId, workspace.id],
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

  const datasets = useMemo<ProjectKnowledgeDataset[]>(() => {
    return datasetQueries.flatMap((query) =>
      (query.data ?? []).map((dataset) => ({
        ...dataset,
        workspaceName: workspaceNameMap.get(dataset.workspace_id) ?? dataset.workspace_id
      }))
    );
  }, [datasetQueries, workspaceNameMap]);

  useEffect(() => {
    if (!selectedDatasetId && datasets.length) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  const uploadDatasets = useMemo(
    () => datasets.filter((dataset) => dataset.workspace_id === targetWorkspaceId),
    [datasets, targetWorkspaceId]
  );

  const uploadForm = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      datasetId: "",
      file: null
    }
  });

  useEffect(() => {
    const currentDatasetId = uploadForm.getValues("datasetId");
    const fallbackDatasetId = uploadDatasets[0]?.id ?? "";

    if (!currentDatasetId || !uploadDatasets.some((dataset) => dataset.id === currentDatasetId)) {
      uploadForm.setValue("datasetId", fallbackDatasetId);
    }
  }, [targetWorkspaceId, uploadDatasets, uploadForm]);

  const datasetDocumentQueries = useQueries({
    queries: datasets.map((dataset) => ({
      queryKey: ["documents", dataset.id],
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

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);

  const selectedChunksQuery = useQuery({
    queryKey: ["chunks", selectedDatasetId],
    queryFn: () =>
      platformApi.listDatasetChunks(
        {
          ...tenant,
          workspaceId: selectedDataset?.workspace_id
        },
        selectedDatasetId
      ),
    enabled: Boolean(selectedDatasetId && selectedDataset?.workspace_id)
  });

  const createDataset = useMutation({
    mutationFn: (values: {
      name: string;
      description?: string;
      embedding_model: string;
      chunk_strategy: string;
    }) =>
      platformApi.createKnowledgeDataset(
        {
          ...tenant,
          workspaceId: targetWorkspaceId
        },
        {
          workspace_id: targetWorkspaceId,
          ...values
        }
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-datasets", tenant.organizationId, tenant.projectId]
      });
    }
  });

  const deleteDataset = useMutation({
    mutationFn: (dataset: ProjectKnowledgeDataset) =>
      platformApi.deleteKnowledgeDataset(
        {
          ...tenant,
          workspaceId: dataset.workspace_id
        },
        dataset.id
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["knowledge-datasets", tenant.organizationId, tenant.projectId]
        }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["chunks"] })
      ]);
    }
  });

  const allDocuments = useMemo(() => {
    const documents = datasetDocumentQueries.flatMap((query) => query.data ?? []);
    const datasetNameMap = new Map(datasets.map((dataset) => [dataset.id, dataset.name]));

    return documents
      .map((document) => ({
        ...document,
        datasetName: datasetNameMap.get(document.dataset_id) ?? document.dataset_id,
        workspaceName: workspaceNameMap.get(document.workspace_id) ?? document.workspace_id
      }))
      .filter((document) => {
        const searchHaystack = [
          document.title,
          document.storage_path,
          document.datasetName,
          document.workspaceName
        ]
          .join(" ")
          .toLowerCase();
        const matchesSearch = searchHaystack.includes(search.toLowerCase());
        const matchesWorkspace =
          workspaceFilter === "all" || document.workspace_id === workspaceFilter;
        return matchesSearch && matchesWorkspace;
      });
  }, [datasetDocumentQueries, datasets, search, workspaceFilter, workspaceNameMap]);

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Operate document storage at the project level. This console aggregates knowledge datasets and uploaded files across every workspace in the selected project while keeping create and upload actions explicitly targeted at one workspace."
          eyebrow="Project"
          title="Documents"
        />

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create dataset</CardTitle>
              <CardDescription>
                Choose the workspace that will own the new retrieval dataset before saving it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectDropdown
                label="Target workspace"
                onChange={(event) => setTargetWorkspaceId(event.target.value)}
                options={workspaces.map((workspace) => ({
                  label: workspace.name,
                  value: workspace.id
                }))}
                placeholder="Choose workspace"
                value={targetWorkspaceId}
              />
              <ConfigForm
                definition={knowledgeDatasetFormDefinition}
                initialValues={{ workspace_id: targetWorkspaceId }}
                loading={createDataset.isPending}
                onSubmit={async (values) => {
                  await createDataset.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
              <CardDescription>
                Pick a workspace, then a dataset inside that workspace. The backend keeps ownership workspace-scoped even though this console is project-wide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-5"
                onSubmit={uploadForm.handleSubmit(async (values) => {
                  const targetDataset = datasets.find((dataset) => dataset.id === values.datasetId);
                  if (!targetDataset) {
                    return;
                  }

                  setUploadStatus("processing");
                  setUploadProgress(0);
                  try {
                    await platformApi.uploadDatasetDocument(
                      {
                        ...tenant,
                        workspaceId: targetDataset.workspace_id
                      },
                      values.datasetId,
                      values.file!,
                      setUploadProgress
                    );
                    setUploadStatus("completed");
                    setSelectedDatasetId(values.datasetId);
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["documents", values.datasetId] }),
                      queryClient.invalidateQueries({ queryKey: ["chunks", values.datasetId] }),
                      queryClient.invalidateQueries({
                        queryKey: ["knowledge-datasets", tenant.organizationId, tenant.projectId]
                      })
                    ]);
                    uploadForm.reset({
                      datasetId: values.datasetId,
                      file: null
                    });
                  } catch {
                    setUploadStatus("failed");
                  }
                })}
              >
                <SelectDropdown
                  label="Target workspace"
                  onChange={(event) => setTargetWorkspaceId(event.target.value)}
                  options={workspaces.map((workspace) => ({
                    label: workspace.name,
                    value: workspace.id
                  }))}
                  placeholder="Choose workspace"
                  value={targetWorkspaceId}
                />
                <Controller
                  control={uploadForm.control}
                  name="datasetId"
                  render={({ field, fieldState }) => (
                    <SelectDropdown
                      description="Documents ingest into the selected dataset inside the chosen workspace."
                      error={fieldState.error?.message}
                      label="Target dataset"
                      onChange={(event) => field.onChange(event.target.value)}
                      options={uploadDatasets.map((dataset) => ({
                        label: `${dataset.name} (${dataset.document_count} docs)`,
                        value: dataset.id
                      }))}
                      placeholder="Choose dataset"
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  control={uploadForm.control}
                  name="file"
                  render={({ field, fieldState }) => (
                    <FileUpload
                      accept=".pdf,.txt,.md"
                      error={fieldState.error?.message}
                      label="Source file"
                      onChange={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <div className="grid gap-3 rounded-xl border border-border/70 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Ingestion status</span>
                    <span
                      className={
                        uploadStatus === "completed"
                          ? "status-pill status-pill--healthy"
                          : uploadStatus === "failed"
                            ? "status-pill status-pill--danger"
                            : "status-pill status-pill--warning"
                      }
                    >
                      {uploadStatus}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploads stay tied to the selected workspace.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button disabled={uploadForm.formState.isSubmitting || !uploadDatasets.length} type="submit">
                    <UploadCloud className="h-4 w-4" />
                    Upload and ingest
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <DataTable
            actions={
              <div className="flex flex-wrap items-end gap-2">
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
                <Button disabled variant="outline">
                  <Trash2 className="h-4 w-4" />
                  Delete selected
                </Button>
                <Button disabled variant="outline">
                  <Wand2 className="h-4 w-4" />
                  Re-index selected
                </Button>
              </div>
            }
            columns={[
              {
                key: "select",
                header: "",
                className: "w-[52px]",
                render: (row) => (
                  <input
                    checked={selectedDocumentIds.includes(row.id)}
                    onChange={(event) =>
                      setSelectedDocumentIds((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((value) => value !== row.id)
                      )
                    }
                    type="checkbox"
                  />
                )
              },
              {
                key: "title",
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
                header: "Workspace",
                render: (row) => row.workspaceName
              },
              {
                key: "metadata",
                header: "Metadata",
                render: (row) => (
                  <div className="space-y-1">
                    <Badge variant="muted">{String(row.metadata?.parser ?? "unknown")}</Badge>
                    <div className="text-xs text-muted-foreground">
                      {(row.metadata?.page_count as number | undefined) ?? "n/a"} pages
                    </div>
                  </div>
                )
              },
              {
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.created_at)
              },
              {
                key: "storage",
                header: "Storage path",
                render: (row) => (
                  <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                    {row.storage_path}
                  </div>
                )
              }
            ]}
            description="Documents are flattened across all workspaces in the selected project, with workspace ownership visible as a first-class column and filter."
            rows={allDocuments}
            title="Project documents"
          />

          <Card>
            <CardHeader>
              <CardTitle>Datasets</CardTitle>
              <CardDescription>
                Review retrieval datasets across the project, then inspect chunks or delete a dataset inside its owning workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextInput
                label="Filter documents"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, storage path, dataset, or workspace"
                value={search}
              />
              <SelectDropdown
                label="Preview dataset"
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                options={datasets.map((dataset) => ({
                  label: `${dataset.name} | ${dataset.workspaceName} | ${formatCount(dataset.chunk_count)} chunks`,
                  value: dataset.id
                }))}
                placeholder="Choose dataset"
                value={selectedDatasetId}
              />
              <div className="space-y-3">
                {datasets.map((dataset) => (
                  <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={dataset.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{dataset.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {dataset.workspaceName} | {dataset.embedding_model} | {formatCount(dataset.document_count)} docs | {" "}
                          {formatCount(dataset.chunk_count)} chunks
                        </div>
                      </div>
                      <Button
                        onClick={() => deleteDataset.mutate(dataset)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Chunk preview</CardTitle>
            <CardDescription>
              Inspect the first chunk payloads for the selected dataset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(selectedChunksQuery.data ?? []).slice(0, 6).map((chunk) => (
              <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={chunk.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Chunk {chunk.id.slice(0, 8)}
                  </span>
                  <Badge variant="muted">{chunk.token_count} tokens</Badge>
                </div>
                <p className="text-sm leading-7 text-slate-700">{chunk.text}</p>
              </div>
            ))}
            {!selectedChunksQuery.data?.length ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                Upload a document to inspect generated chunks here.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </ProjectGuard>
  );
}

