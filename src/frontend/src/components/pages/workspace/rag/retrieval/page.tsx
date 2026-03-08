"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { workspaceRagRetrievalFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagRetrievalPage() {
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
            ...patch,
            retrieval_config: {
                ...base.retrieval_config,
                ...patch.retrieval_config
            }
        });
    }

    return (
        <WorkspaceGuard>
            <div className="grid gap-6">
                <PageHeader eyebrow="RAG Settings" title="Retrieval" />
                <Card>
                    <CardHeader>
                        <CardTitle>Search & Ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ConfigForm
                            definition={workspaceRagRetrievalFormDefinition}
                            initialValues={configQuery.data?.retrieval_config}
                            loading={saveConfig.isPending || configQuery.isLoading}
                            onSubmit={(values) => savePartial({ retrieval_config: values })}
                        />
                    </CardContent>
                </Card>
            </div>
        </WorkspaceGuard>
    );
}
