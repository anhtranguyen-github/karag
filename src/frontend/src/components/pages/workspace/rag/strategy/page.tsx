"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import {
    workspaceRagPromptFormDefinition,
    workspaceRagReadingFormDefinition
} from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagStrategyPage() {
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
                <PageHeader eyebrow="RAG Settings" title="Strategy" />

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Prompt Template</CardTitle>
                            <CardDescription>
                                Define the system prompt and how retrieved context is injected.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConfigForm
                                definition={workspaceRagPromptFormDefinition}
                                initialValues={{
                                    prompt_template: config?.rag.prompt_template
                                }}
                                loading={saveConfig.isPending || configQuery.isLoading}
                                onSubmit={(values) => savePartial({ rag: values })}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Reading Strategy</CardTitle>
                            <CardDescription>
                                Control how the system reads and interprets retrieved documents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConfigForm
                                definition={workspaceRagReadingFormDefinition}
                                initialValues={config?.rag ? {
                                    max_context_tokens: config.rag.max_context_tokens,
                                    context_compression: config.rag.context_compression,
                                    citation_mode: config.rag.citation_mode,
                                    context_formatting_template: config.rag.context_formatting_template
                                } : undefined}
                                loading={saveConfig.isPending || configQuery.isLoading}
                                onSubmit={(values) => savePartial({ rag: values })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </WorkspaceGuard>
    );
}
