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
    const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
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

    const modelsQuery = useQuery({
        queryKey: ["models", tenant.organizationId],
        queryFn: () => platformApi.listModels(tenant),
        enabled: Boolean(tenant.organizationId)
    });

    const embeddingProviderOptions = useMemo(() => {
        return runtime.data?.filter(p => p.kind === "embedding").map(p => ({ label: p.provider, value: p.provider })) ?? [];
    }, [runtime.data]);

    // Dynamic model options based on both Registry and Runtime
    const modelOptions = useMemo(() => {
        const availableOptions = (runtime.modelOptionsByProvider[currentProvider] || []);

        // Also combine with registered models of same type
        const embeddingTypes = new Set(["embedding", "feature-extraction"]);
        const registered = (modelsQuery.data ?? [])
            .filter((m) => embeddingTypes.has(m.type))
            .map((m) => ({ label: `${m.name} (DB)`, value: m.name }));

        // Deduplicate
        const seen = new Set(availableOptions.map(o => o.value));
        const combined = [...availableOptions];
        for (const r of registered) {
            if (!seen.has(r.value)) {
                combined.push(r);
                seen.add(r.value);
            }
        }

        return combined;
    }, [runtime.modelOptionsByProvider, currentProvider, modelsQuery.data]);

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
                        <CardTitle className="text-white">Vectorization Model</CardTitle>
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
                            onValuesChange={(values) => {
                                if (values.embedding_provider !== currentProvider) {
                                    setCurrentProvider(values.embedding_provider);
                                }
                            }}
                            onSubmit={(values) =>
                                savePartial({
                                    embedding_provider: values.embedding_provider,
                                    embedding_model: values.embedding_model,
                                    embedding_dimension: values.embedding_dimension ?? null,
                                    embedding_batch_size: values.embedding_batch_size
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
