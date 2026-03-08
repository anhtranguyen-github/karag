"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import {
  workspaceRagEmbeddingFormDefinition,
  workspaceRagLlmFormDefinition,
  workspaceRagPromptFormDefinition,
  workspaceRagReadingFormDefinition,
  workspaceRagRetrievalFormDefinition,
  workspaceRagVectorStoreFormDefinition
} from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
  const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
  return rest;
}

function mergeConfig(
  current: WorkspaceRagConfig,
  patch: Partial<WorkspaceRagConfigUpdate>
): WorkspaceRagConfigUpdate {
  const base = toUpdatePayload(current);
  return {
    ...base,
    ...patch,
    vector_store_config: {
      ...base.vector_store_config,
      ...patch.vector_store_config
    },
    retrieval_config: {
      ...base.retrieval_config,
      ...patch.retrieval_config
    },
    reading_config: {
      ...base.reading_config,
      ...patch.reading_config
    },
    llm_config: {
      ...base.llm_config,
      ...patch.llm_config
    }
  };
}

export default function WorkspaceRagSettingsPageView() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["workspace-rag-config", tenant.workspaceId],
    queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  const saveConfig = useMutation({
    mutationFn: (body: WorkspaceRagConfigUpdate) =>
      platformApi.updateWorkspaceRagConfig(tenant, tenant.workspaceId!, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(["workspace-rag-config", tenant.workspaceId], data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-rag-config", tenant.workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-chat", "knowledge-datasets", tenant.workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-overview", "knowledge-datasets", tenant.workspaceId] })
      ]);
    }
  });

  async function savePartial(patch: Partial<WorkspaceRagConfigUpdate>) {
    if (!configQuery.data) {
      return;
    }
    await saveConfig.mutateAsync(mergeConfig(configQuery.data, patch));
  }

  const config = configQuery.data;

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Workspace" title="RAG Settings" />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Vector store" value={config?.vector_store_type ?? "qdrant"} />
          <MetricCard label="Embedding model" value={config?.embedding_model ?? "text-embedding-3-small"} />
          <MetricCard label="Model" value={config?.llm_config.model ?? "gpt-4o-mini"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Retrieval</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagRetrievalFormDefinition}
                initialValues={config?.retrieval_config}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) => savePartial({ retrieval_config: values })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embedding</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagEmbeddingFormDefinition}
                initialValues={{
                  embedding_provider: config?.embedding_provider,
                  embedding_model: config?.embedding_model,
                  embedding_dimension: config?.embedding_dimension ?? undefined,
                  embedding_batch_size: config?.embedding_batch_size
                }}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) =>
                  savePartial({
                    embedding_provider: values.embedding_provider,
                    embedding_model: values.embedding_model,
                    embedding_dimension: values.embedding_dimension ?? null,
                    embedding_batch_size: values.embedding_batch_size
                  })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vector Store</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagVectorStoreFormDefinition}
                initialValues={{
                  vector_store_type: config?.vector_store_type,
                  collection_name: config?.vector_store_config.collection_name ?? "",
                  distance_metric: config?.vector_store_config.distance_metric,
                  index_type: config?.vector_store_config.index_type
                }}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) =>
                  savePartial({
                    vector_store_type: values.vector_store_type,
                    vector_store_config: {
                      collection_name: values.collection_name || null,
                      distance_metric: values.distance_metric,
                      index_type: values.index_type
                    }
                  })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reading Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagReadingFormDefinition}
                initialValues={config?.reading_config}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) => savePartial({ reading_config: values })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LLM Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagLlmFormDefinition}
                initialValues={config?.llm_config}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) => savePartial({ llm_config: values })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt Template</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceRagPromptFormDefinition}
                initialValues={{ prompt_template: config?.prompt_template }}
                loading={saveConfig.isPending || configQuery.isLoading}
                onSubmit={(values) => savePartial({ prompt_template: values.prompt_template })}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}
