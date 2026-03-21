"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { workspaceRagEmbeddingFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";
import { useRuntimeModels } from "@/hooks/useRuntimeModels";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagEmbeddingPage() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const runtime = useRuntimeModels();
    const [currentProvider, setCurrentProvider] = useState<string>("openai");

    const configQuery = useQuery({
        queryKey: ["workspace-rag-config", tenant.workspaceId],
        queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
        enabled: Boolean(tenant.workspaceId)
    });

    const embeddingProviderOptions = useMemo(() => {
        return runtime.data?.filter(p => p.kind === "embedding").map(p => ({ label: p.provider, value: p.provider })) ?? [];
    }, [runtime.data]);

    const modelOptions = useMemo(() => {
        return runtime.modelOptionsByProvider[currentProvider] || [];
    }, [runtime.modelOptionsByProvider, currentProvider]);

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
            ...patch
        });
    }

    const config = configQuery.data;

    return (
        <WorkspaceGuard>
            <div className="grid gap-6 animate-in fade-in duration-500">
                <PageHeader eyebrow="RAG Settings" title="Embedding" description="Select the vectorizer that will transform your documents and queries into high-dimensional embeddings." />
                <Card className="border-slate-800 bg-[#1c1c21]">
                    <CardHeader>
                        <CardTitle className="text-[#e5e5e5]">Vectorization Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ConfigForm
                            definition={workspaceRagEmbeddingFormDefinition}
                            initialValues={{
                                embedding_provider: config?.embedding.provider,
                                embedding_model: config?.embedding.model,
                                embedding_dimension: config?.embedding.dimension ?? undefined,
                                embedding_batch_size: config?.embedding.batch_size,
                                api_key: config?.embedding.api_key ?? undefined
                            }}
                            loading={saveConfig.isPending || configQuery.isLoading}
                            onValuesChange={(values) => {
                                if (values.embedding_provider !== currentProvider) {
                                    setCurrentProvider(values.embedding_provider);
                                }
                            }}
                            onSubmit={(values) =>
                                savePartial({
                                    embedding: {
                                        provider: values.embedding_provider,
                                        model: values.embedding_model,
                                        dimension: values.embedding_dimension ?? null,
                                        batch_size: values.embedding_batch_size,
                                        api_key: values.api_key
                                    }
                                })
                            }
                            overrides={{
                                embedding_provider: { options: embeddingProviderOptions.length ? embeddingProviderOptions : undefined },
                                embedding_model: {
                                    options: modelOptions.length > 0 ? modelOptions : undefined,
                                    placeholder: "Select an embedding model..."
                                }
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </WorkspaceGuard>
    );
}
