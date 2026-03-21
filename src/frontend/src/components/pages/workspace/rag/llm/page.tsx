"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { workspaceRagLlmFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import { useRuntimeModels } from "@/hooks/useRuntimeModels";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagLlmPage() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const runtime = useRuntimeModels();
    const [currentProvider, setCurrentProvider] = useState<string>("openai");

    const configQuery = useQuery({
        queryKey: ["workspace-rag-config", tenant.workspaceId],
        queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
        enabled: Boolean(tenant.workspaceId)
    });

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
                <PageHeader eyebrow="RAG Settings" title="LLM Generation" description="Configure the LLM engine used for answer synthesis in your RAG pipeline." />
                <Card className="border-slate-800 bg-[#1c1c21]">
                    <CardHeader>
                        <CardTitle className="text-[#e5e5e5]">Inference Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ConfigForm
                            definition={workspaceRagLlmFormDefinition}
                            initialValues={config ? {
                                ...config.llm,
                                api_key: config.llm.api_key ?? undefined,
                                api_base: config.llm.api_base ?? undefined
                            } : undefined}
                            loading={saveConfig.isPending || configQuery.isLoading}
                            onValuesChange={(values) => {
                                if (values.provider !== currentProvider) {
                                    setCurrentProvider(values.provider);
                                }
                            }}
                            onSubmit={(values) => savePartial({ llm: values })}
                            overrides={{
                                provider: { options: runtime.providerOptions.length ? runtime.providerOptions : undefined },
                                model: {
                                    options: modelOptions.length > 0 ? modelOptions : undefined,
                                    placeholder: "Select an available model..."
                                }
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </WorkspaceGuard>
    );
}
