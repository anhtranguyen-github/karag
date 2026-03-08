"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ConfigForm } from "@/components/config/config-form";
import type { ConfigFormDefinition } from "@/components/config/types";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { modelFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";
import { useEffect, useMemo, useState } from "react";

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
    workspace_id: z.ZodString;
    target: z.ZodString;
    inference_url: z.ZodString;
  }>
> = {
  schema: z.object({
    workspace_id: z.string().min(1),
    target: z.string().min(1),
    inference_url: z.string().url()
  }),
  defaultValues: {
    workspace_id: "",
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

export default function ModelsPageView() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");

  const modelsQuery = useQuery({
    queryKey: ["models", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listModels(tenant),
    enabled: Boolean(tenant.organizationId && tenant.projectId)
  });

  useEffect(() => {
    if (!selectedModelId && modelsQuery.data?.length) {
      setSelectedModelId(modelsQuery.data[0].id);
    }
  }, [modelsQuery.data, selectedModelId]);

  const versionQueries = useQueries({
    queries: (modelsQuery.data ?? []).map((model) => ({
      queryKey: ["model-versions", model.id],
      queryFn: () => platformApi.listModelVersions(tenant, model.id)
    }))
  });

  const selectedVersions =
    versionQueries.find((query, index) => modelsQuery.data?.[index]?.id === selectedModelId)?.data ?? [];

  useEffect(() => {
    if (!selectedVersionId && selectedVersions.length) {
      setSelectedVersionId(selectedVersions[0].id);
    }
  }, [selectedVersionId, selectedVersions]);

  const artifactQuery = useQuery({
    queryKey: ["model-artifacts", selectedVersionId],
    queryFn: () => platformApi.listModelArtifacts(tenant, selectedVersionId),
    enabled: Boolean(selectedVersionId)
  });

  const deploymentQuery = useQuery({
    queryKey: ["model-deployments", selectedVersionId],
    queryFn: () => platformApi.listModelDeployments(tenant, selectedVersionId),
    enabled: Boolean(selectedVersionId)
  });

  const createModel = useMutation({
    mutationFn: (values: { name: string; type: string; framework: string; description?: string }) =>
      platformApi.createModel(tenant, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["models", tenant.organizationId, tenant.projectId] });
    }
  });

  const createVersion = useMutation({
    mutationFn: (values: { version: string; release_notes?: string }) =>
      platformApi.createModelVersion(tenant, selectedModelId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["model-versions", selectedModelId] });
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
      await queryClient.invalidateQueries({ queryKey: ["model-artifacts", selectedVersionId] });
    }
  });

  const createDeployment = useMutation({
    mutationFn: (values: { target: string; inference_url: string; workspace_id: string }) =>
      platformApi.createModelDeployment(tenant, selectedVersionId, {
        ...values,
        configuration: {
          provider: values.target,
          model: artifactQuery.data?.[0]?.name ?? "gpt-4o-mini"
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["model-deployments", selectedVersionId] });
    }
  });

  const versionCountMap = useMemo(
    () =>
      new Map(
        (modelsQuery.data ?? []).map((model, index) => [model.id, versionQueries[index]?.data?.length ?? 0])
      ),
    [modelsQuery.data, versionQueries]
  );

  return (
    <WorkspaceGuard description="Model registry and deployments are project-scoped, and deployments also bind to a workspace. Select a workspace to continue.">
      <div className="grid gap-6">
        <PageHeader
          description="Register model providers, attach artifacts, and create workspace-scoped deployments. This UI mirrors the backend model registry and makes verifying the runtime path possible without shell access."
          eyebrow="ModelOps"
          title="Models"
        />

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Register model</CardTitle>
              <CardDescription>
                Create a model entry before adding versions and deployment targets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={modelFormDefinition}
                loading={createModel.isPending}
                onSubmit={async (values) => {
                  await createModel.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create version</CardTitle>
              <CardDescription>
                Versions track release notes and validation state per model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artifact and deployment</CardTitle>
              <CardDescription>
                Attach a storage artifact and bind the version to a workspace deployment target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <ConfigForm
                definition={deploymentFormDefinition}
                initialValues={{ workspace_id: tenant.workspaceId ?? "" }}
                loading={createDeployment.isPending}
                onSubmit={async (values) => {
                  await createDeployment.mutateAsync({
                    ...values,
                    workspace_id: tenant.workspaceId!
                  });
                }}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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
            description="Model registry entries currently stored for the active organization."
            rows={modelsQuery.data ?? []}
            title="Registered models"
          />

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Artifacts</CardTitle>
                <CardDescription>Storage references associated with the selected version.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(artifactQuery.data ?? []).map((artifact) => (
                  <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={artifact.id}>
                    <div className="font-medium text-slate-900">{artifact.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{artifact.storage_path}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Deployments</CardTitle>
                <CardDescription>Workspace-bound endpoints for the selected version.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
          </div>
        </section>
      </div>
    </WorkspaceGuard>
  );
}



