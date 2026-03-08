"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { workspaceRagEmbeddingFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagEmbeddingPage() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();

    const configQuery = useQuery({
        queryKey: ["workspace-rag-config", tenant.workspaceId],
        queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
        enabled: Boolean(tenant.workspaceId)
    });

    const modelsQuery = useQuery({
        queryKey: ["models", tenant.organizationId],
        queryFn: () => platformApi.listModels(tenant),
        enabled: Boolean(tenant.organizationId)
    });

    // Filter to only embedding / feature-extraction models
    const modelOptions = useMemo(() => {
        const embeddingTypes = new Set(["embedding", "feature-extraction"]);
        return (modelsQuery.data ?? [])
            .filter((m) => embeddingTypes.has(m.type))
            .map((m) => ({
                label: m.name,
                value: m.name
            }));
    }, [modelsQuery.data]);

    const saveConfig = useMutation({
        mutationFn: (body: WorkspaceRagConfigUpdate) =>
            platformApi.updateWorkspaceRagConfig(tenant, tenant.workspaceId!, body),
        onSuccess: (data) => {
            queryClient.setQueryData(["workspace-rag-config", tenant.workspaceId], data);
        }
    });

    async function savePartial(patch: Partial<WorkspaceRagConfigUpdate>) {
        if (!configQuery.data) return;
        const base = toUpdatePayload(configQuery.data);
        await saveConfig.mutateAsync({
            ...base,
            ...patch,
            embedding_provider: patch.embedding_provider ?? base.embedding_provider,
            embedding_model: patch.embedding_model ?? base.embedding_model,
            embedding_dimension: patch.embedding_dimension !== undefined ? patch.embedding_dimension : base.embedding_dimension,
            embedding_batch_size: patch.embedding_batch_size ?? base.embedding_batch_size
        });
    }

    const config = configQuery.data;

    return (
        <WorkspaceGuard>
            <div className="grid gap-6">
                <PageHeader eyebrow="RAG Settings" title="Embedding" />
                <Card>
                    <CardHeader>
                        <CardTitle>Vectorization Model</CardTitle>
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
                            overrides={{
                                embedding_model: {
                                    options: modelOptions.length > 0 ? modelOptions : undefined
                                }
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </WorkspaceGuard>
    );
}
