"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { projectDocumentStorageFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectDocumentStoragePage() {
    const { tenant } = useTenant();
    const params = useParams();
    const queryClient = useQueryClient();

    // Use params directly if tenant hasn't resolved yet
    const organizationId = tenant.organizationId || params.organizationId as string;
    const projectId = tenant.projectId || params.projectId as string;

    const projectQuery = useQuery({
        queryKey: ["project", organizationId, projectId],
        queryFn: () => platformApi.getProject(organizationId, projectId),
        enabled: Boolean(organizationId && projectId)
    });

    const { data: providers } = useQuery({
        queryKey: ["providers"],
        queryFn: () => platformApi.listProviders(),
        staleTime: 1000 * 60 * 5,
    });

    const saveConfig = useMutation({
        mutationFn: (body: any) =>
            platformApi.updateProject(organizationId, projectId, body),
        onSuccess: (data) => {
            queryClient.setQueryData(["project", organizationId, projectId], data);
        }
    });

    const config = projectQuery.data?.document_storage_config;

    return (
        <div className="grid gap-6 p-6">
            <PageHeader eyebrow="Project Settings" title="Document Storage" />
            <Card>
                <CardHeader>
                    <CardTitle>Storage Backend</CardTitle>
                    <CardDescription>
                        Configure where your raw documents are stored before processing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConfigForm
                        definition={{
                            ...projectDocumentStorageFormDefinition,
                            // Override provider options dynamically
                            defaultValues: projectDocumentStorageFormDefinition.defaultValues,
                            fields: projectDocumentStorageFormDefinition.fields.map((f) => {
                                if (f.name === "provider") {
                                    return {
                                        ...f,
                                        options: (providers?.storage_providers || ["minio"]).map((p: string) => ({ label: p, value: p })),
                                    };
                                }
                                return f;
                            }),
                        }}
                        initialValues={{
                            provider: config?.provider ?? "minio",
                            endpoint: config?.endpoint ?? "",
                            access_key: "", // Don't show existing keys for security
                            secret_key: "",
                            bucket: config?.bucket ?? "karag",
                            secure: config?.secure ?? false
                        }}
                        loading={saveConfig.isPending || projectQuery.isLoading}
                        onSubmit={(values) =>
                            saveConfig.mutate({
                                document_storage_config: {
                                    ...values,
                                    access_key: values.access_key || null,
                                    secret_key: values.secret_key || null
                                }
                            })
                        }
                    />
                </CardContent>
            </Card>
        </div>
    );
}
