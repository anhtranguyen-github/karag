"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlugZap, ServerCrash, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { ConfigForm } from "@/components/config/config-form";
import type { ConfigFormDefinition } from "@/components/config/types";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { modelFormDefinition, providerFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import {
  useProjectCollection,
  useUpsertProjectCollection
} from "@/lib/local-query";
import type { ProjectProviderRecord } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const versionFormDefinition: ConfigFormDefinition<
  z.ZodObject<{ version: z.ZodString; release_notes: z.ZodOptional<z.ZodString> }>
> = {
  schema: z.object({
    version: z.string().min(1),
    release_notes: z.string().optional()
  }),
  defaultValues: {
    version: "1.0.0",
    release_notes: ""
  },
  fields: [
    { name: "version", label: "Version", placeholder: "1.0.0" },
    {
      name: "release_notes",
      label: "Release notes",
      component: "textarea",
      placeholder: "What changed in this version?"
    }
  ],
  submitLabel: "Create version"
};

const artifactFormDefinition: ConfigFormDefinition<
  z.ZodObject<{
    name: z.ZodString;
    artifact_type: z.ZodString;
    storage_backend: z.ZodString;
  }>
> = {
  schema: z.object({
    name: z.string().min(2),
    artifact_type: z.string().min(1),
    storage_backend: z.string().min(1)
  }),
  defaultValues: {
    name: "gpt-4o-mini",
    artifact_type: "remote-model",
    storage_backend: "minio"
  },
  fields: [
    { name: "name", label: "Artifact name", placeholder: "gpt-4o-mini" },
    {
      name: "artifact_type",
      label: "Artifact type",
      component: "select",
      options: [
        { label: "Remote model", value: "remote-model" },
        { label: "GGUF artifact", value: "gguf" },
        { label: "HF weights", value: "huggingface-weights" }
      ]
    },
    {
      name: "storage_backend",
      label: "Storage backend",
      component: "select",
      options: [
        { label: "MinIO", value: "minio" },
        { label: "S3", value: "s3" }
      ]
    }
  ],
  submitLabel: "Create artifact"
};

const deploymentFormDefinition: ConfigFormDefinition<
  z.ZodObject<{
    target: z.ZodString;
    inference_url: z.ZodString;
  }>
> = {
  schema: z.object({
    target: z.string().min(1),
    inference_url: z.string().url()
  }),
  defaultValues: {
    target: "openai",
    inference_url: "https://api.openai.com/v1"
  },
  fields: [
    {
      name: "target",
      label: "Deployment target",
      component: "select",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Ollama", value: "ollama" },
        { label: "vLLM", value: "vllm" }
      ]
    },
    {
      name: "inference_url",
      label: "Inference URL",
      placeholder: "https://api.openai.com/v1"
    }
  ],
  submitLabel: "Deploy model"
};

function inferProviderStatus(
  providerType: string,
  dependencyHealth?: Awaited<ReturnType<typeof platformApi.dependencyHealth>>,
  runtimeModels?: Awaited<ReturnType<typeof platformApi.runtimeModels>>
) {
  if (!dependencyHealth) {
    return "not-configured" as const;
  }

  if (providerType === "qdrant") {
    return dependencyHealth.providers.vector_store === "qdrant" ? "connected" : "failed";
  }
  if (providerType === "minio") {
    return dependencyHealth.providers.storage_provider === "minio" ? "connected" : "failed";
  }
  if (providerType === "openai" || providerType === "ollama") {
    return runtimeModels?.some((entry) => entry.provider === providerType)
      ? "connected"
      : "failed";
  }
  return "not-configured";
}

export default function ProjectIntegrationsPageView() {
  const { tenant, workspaces } = useTenant();
  const queryClient = useQueryClient();
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [deploymentWorkspaceId, setDeploymentWorkspaceId] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const providersQuery = useProjectCollection<ProjectProviderRecord>(tenant.projectId, "providers");
  const saveProvider = useUpsertProjectCollection<ProjectProviderRecord>(tenant.projectId, "providers");

  const modelsQuery = useQuery({
    queryKey: ["project-integrations", "models", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listModels(tenant),
    enabled: Boolean(tenant.organizationId && tenant.projectId)
  });

  const versionQueries = useQueries({
    queries: (modelsQuery.data ?? []).map((model) => ({
      queryKey: ["project-integrations", "versions", model.id],
      queryFn: () => platformApi.listModelVersions(tenant, model.id)
    }))
  });

  const selectedVersions =
    versionQueries.find((query, index) => modelsQuery.data?.[index]?.id === selectedModelId)?.data ?? [];

  useEffect(() => {
    if (!selectedModelId && modelsQuery.data?.length) {
      setSelectedModelId(modelsQuery.data[0].id);
    }
  }, [modelsQuery.data, selectedModelId]);

  useEffect(() => {
    if (!selectedVersionId && selectedVersions.length) {
      setSelectedVersionId(selectedVersions[0].id);
    }
  }, [selectedVersionId, selectedVersions]);

  useEffect(() => {
    if (!deploymentWorkspaceId && workspaces.length) {
      setDeploymentWorkspaceId(workspaces[0].id);
    }
  }, [deploymentWorkspaceId, workspaces]);

  const artifactQuery = useQuery({
    queryKey: ["project-integrations", "artifacts", selectedVersionId],
    queryFn: () => platformApi.listModelArtifacts(tenant, selectedVersionId),
    enabled: Boolean(selectedVersionId)
  });

  const deploymentQuery = useQuery({
    queryKey: ["project-integrations", "deployments", selectedVersionId],
    queryFn: () => platformApi.listModelDeployments(tenant, selectedVersionId),
    enabled: Boolean(selectedVersionId)
  });

  const dependencyHealthQuery = useQuery({
    queryKey: ["project-integrations", "health"],
    queryFn: platformApi.dependencyHealth
  });

  const runtimeModelsQuery = useQuery({
    queryKey: ["project-integrations", "runtime-models"],
    queryFn: platformApi.runtimeModels
  });

  const createModel = useMutation({
    mutationFn: (values: { name: string; type: string; framework: string; description?: string }) =>
      platformApi.createModel(tenant, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-integrations", "models", tenant.organizationId, tenant.projectId]
      });
    }
  });

  const createVersion = useMutation({
    mutationFn: (values: { version: string; release_notes?: string }) =>
      platformApi.createModelVersion(tenant, selectedModelId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-integrations", "versions", selectedModelId]
      });
    }
  });

  const createArtifact = useMutation({
    mutationFn: (values: { name: string; artifact_type: string; storage_backend: string }) =>
      platformApi.createModelArtifact(tenant, selectedVersionId, {
        ...values,
        metadata: {
          model: values.name,
          provider: modelsQuery.data?.find((model) => model.id === selectedModelId)?.framework ?? "openai"
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-integrations", "artifacts", selectedVersionId]
      });
    }
  });

  const createDeployment = useMutation({
    mutationFn: (values: { target: string; inference_url: string }) =>
      platformApi.createModelDeployment(tenant, selectedVersionId, {
        ...values,
        workspace_id: deploymentWorkspaceId,
        configuration: {
          provider: values.target,
          model: artifactQuery.data?.[0]?.name ?? "gpt-4o-mini"
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["project-integrations", "deployments", selectedVersionId]
      });
    }
  });

  const verifyProvider = useMutation({
    mutationFn: async (providerType: string) => {
      if (providerType === "openai" || providerType === "ollama") {
        const model =
          runtimeModelsQuery.data?.find((entry) => entry.provider === providerType)?.models[0] ??
          (providerType === "openai" ? "gpt-4o-mini" : "llama3");
        return platformApi.verifyChatProvider(tenant, {
          provider: providerType,
          model,
          workspace_id: deploymentWorkspaceId || tenant.workspaceId
        });
      }
      return Promise.resolve({ content: "ok" });
    }
  });

  const providers = providersQuery.data ?? [];
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const versionCountMap = useMemo(
    () =>
      new Map(
        (modelsQuery.data ?? []).map((model, index) => [model.id, versionQueries[index]?.data?.length ?? 0])
      ),
    [modelsQuery.data, versionQueries]
  );

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Integrations live at the project layer because providers, model registry, and deployments support every workspace inside the project."
          eyebrow="Project"
          title="Integrations"
        />

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Model registry</CardTitle>
                <CardDescription>
                  Register models, attach artifacts, and deploy them into project workspaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-3">
                <ConfigForm
                  definition={modelFormDefinition}
                  loading={createModel.isPending}
                  onSubmit={async (values) => {
                    await createModel.mutateAsync(values);
                  }}
                  resetOnSubmit
                />
                <div className="space-y-4">
                  <SelectDropdown
                    label="Target model"
                    onChange={(event) => {
                      setSelectedModelId(event.target.value);
                      setSelectedVersionId("");
                    }}
                    options={(modelsQuery.data ?? []).map((model) => ({
                      label: model.name,
                      value: model.id
                    }))}
                    placeholder="Choose model"
                    value={selectedModelId}
                  />
                  <ConfigForm
                    definition={versionFormDefinition}
                    loading={createVersion.isPending}
                    onSubmit={async (values) => {
                      await createVersion.mutateAsync(values);
                    }}
                    resetOnSubmit
                  />
                </div>
                <div className="space-y-4">
                  <SelectDropdown
                    label="Target version"
                    onChange={(event) => setSelectedVersionId(event.target.value)}
                    options={selectedVersions.map((version) => ({
                      label: version.version,
                      value: version.id
                    }))}
                    placeholder="Choose version"
                    value={selectedVersionId}
                  />
                  <ConfigForm
                    definition={artifactFormDefinition}
                    loading={createArtifact.isPending}
                    onSubmit={async (values) => {
                      await createArtifact.mutateAsync(values);
                    }}
                    resetOnSubmit
                  />
                  <SelectDropdown
                    label="Deploy into workspace"
                    onChange={(event) => setDeploymentWorkspaceId(event.target.value)}
                    options={workspaces.map((workspace) => ({
                      label: workspace.name,
                      value: workspace.id
                    }))}
                    placeholder="Choose workspace"
                    value={deploymentWorkspaceId}
                  />
                  <ConfigForm
                    definition={deploymentFormDefinition}
                    loading={createDeployment.isPending}
                    onSubmit={async (values) => {
                      await createDeployment.mutateAsync(values);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <DataTable
              columns={[
                {
                  key: "model",
                  header: "Model",
                  render: (row) => (
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.framework}</div>
                    </div>
                  )
                },
                {
                  key: "type",
                  header: "Type",
                  render: (row) => <Badge variant="muted">{row.type}</Badge>
                },
                {
                  key: "state",
                  header: "State",
                  render: (row) => <Badge variant="success">{row.lifecycle_state}</Badge>
                },
                {
                  key: "versions",
                  header: "Versions",
                  render: (row) => versionCountMap.get(row.id) ?? 0
                },
                {
                  key: "created",
                  header: "Created",
                  render: (row) => formatDate(row.created_at)
                }
              ]}
              description="Model registry entries visible to this project."
              rows={modelsQuery.data ?? []}
              title="Registered models"
            />
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Saved providers</CardTitle>
                <CardDescription>
                  Project-wide provider records and connectivity checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConfigForm
                  definition={providerFormDefinition}
                  loading={saveProvider.isPending}
                  onSubmit={async (values) => {
                    const status = inferProviderStatus(
                      values.providerType,
                      dependencyHealthQuery.data,
                      runtimeModelsQuery.data
                    );
                    await saveProvider.mutateAsync({
                      id: crypto.randomUUID(),
                      projectId: tenant.projectId!,
                      providerType: values.providerType,
                      name: values.name,
                      config: values,
                      status,
                      createdAt: new Date().toISOString()
                    });
                  }}
                  resetOnSubmit
                />
                <SelectDropdown
                  label="Provider record"
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  options={providers.map((provider) => ({
                    label: provider.name,
                    value: provider.id
                  }))}
                  placeholder="Choose provider"
                  value={selectedProviderId}
                />
                {providers.map((provider) => (
                  <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={provider.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{provider.name}</div>
                        <div className="text-xs text-muted-foreground">{provider.providerType}</div>
                      </div>
                      <Badge
                        variant={
                          provider.status === "connected"
                            ? "success"
                            : provider.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {provider.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection verification</CardTitle>
                <CardDescription>
                  Validate the currently selected provider through the running backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProvider ? (
                  <div className="rounded-xl border border-border/70 bg-white/70 p-4">
                    <div className="mb-4">
                      <div className="font-medium text-slate-900">{selectedProvider.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedProvider.providerType}
                      </div>
                    </div>
                    <Button
                      onClick={() => verifyProvider.mutate(selectedProvider.providerType)}
                      type="button"
                    >
                      <PlugZap className="h-4 w-4" />
                      Verify connection
                    </Button>
                    {verifyProvider.data ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Provider responded successfully through the runtime API.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                    Save or select a provider record to verify it here.
                  </div>
                )}

                <div className="rounded-xl border border-border/70 bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    {dependencyHealthQuery.data?.providers.vector_store === "qdrant" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ServerCrash className="h-4 w-4 text-amber-600" />
                    )}
                    Vector database
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {dependencyHealthQuery.data?.providers.vector_store === "qdrant"
                      ? "Qdrant is detected as the active vector store."
                      : "Local service not detected. Install via Docker Compose."}
                  </p>
                  <Button className="mt-3" type="button" variant="outline">
                    <Wrench className="h-4 w-4" />
                    Install via Docker
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Artifacts and deployments</CardTitle>
                    <CardDescription>
                      Inspect the selected model version artifacts and workspace deployments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(artifactQuery.data ?? []).map((artifact) => (
                      <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={artifact.id}>
                        <div className="font-medium text-slate-900">{artifact.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{artifact.storage_path}</div>
                      </div>
                    ))}
                    {(deploymentQuery.data ?? []).map((deployment) => (
                      <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={deployment.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900">{deployment.target}</div>
                          <Badge variant="success">{deployment.lifecycle_state}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{deployment.inference_url}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ProjectGuard>
  );
}
