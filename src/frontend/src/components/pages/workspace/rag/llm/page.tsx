"use client";

import { useMemo } from "react";
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
    const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagLlmPage() {
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

    const runtime = useRuntimeModels();


    // Filter to only chat / text-generation models for the LLM dropdown
    const modelOptions = useMemo(() => {
        const chatTypes = new Set(["chat", "text-generation", "image-text-to-text"]);
        return (modelsQuery.data ?? [])
            .filter((m) => chatTypes.has(m.type))
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
            ...patch
        });
    }

    const config = configQuery.data;

    return (
        <WorkspaceGuard>
            <div className="grid gap-6">
                <PageHeader eyebrow="RAG Settings" title="LLM Generation" />
                <Card>
                    <CardHeader>
                        <CardTitle>Inference Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ConfigForm
                            definition={workspaceRagLlmFormDefinition}
                            initialValues={config?.llm_config}
                            loading={saveConfig.isPending || configQuery.isLoading}
                            onSubmit={(values) => savePartial({ llm_config: values })}
                            overrides={{
                                provider: { options: runtime.providerOptions.length ? runtime.providerOptions : undefined },
                                model: { options: modelOptions.length > 0 ? modelOptions : undefined }
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </WorkspaceGuard>
    );
}
