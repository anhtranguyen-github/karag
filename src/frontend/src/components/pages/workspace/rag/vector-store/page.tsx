"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { workspaceRagVectorStoreFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import type { WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
    const { workspace_id, organization_id, project_id, updated_at, ...rest } = config;
    return rest;
}

export default function WorkspaceRagVectorStorePage() {
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
            vector_store_config: {
                ...base.vector_store_config,
                ...patch.vector_store_config
            }
        });
    }

    const config = configQuery.data;

    return (
        <WorkspaceGuard>
            <div className="grid gap-6">
                <PageHeader eyebrow="RAG Settings" title="Vector Store" />
                <Card>
                    <CardHeader>
                        <CardTitle>Storage Backend</CardTitle>
                        <CardDescription>
                            Configure where your vectors are stored and how they are indexed.
                        </CardDescription>
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
            </div>
        </WorkspaceGuard>
    );
}
