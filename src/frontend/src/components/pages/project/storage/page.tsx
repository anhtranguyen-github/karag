"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { projectDocumentStorageFormDefinition } from "@/lib/form-definitions";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectDocumentStoragePage() {
  const { tenant } = useTenant();
  const params = useParams();
  const queryClient = useQueryClient();
  const organizationId = tenant.organizationId || (params.organizationId as string);
  const projectId = tenant.projectId || (params.projectId as string);

  const projectQuery = useQuery({
    queryKey: ["project", organizationId, projectId],
    queryFn: () => platformApi.getProject(tenant, organizationId, projectId),
    enabled: Boolean(organizationId && projectId),
  });

  const saveConfig = useMutation({
    mutationFn: (body: any) => platformApi.updateProject(tenant, organizationId, projectId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", organizationId, projectId], data);
    },
  });

  const config = projectQuery.data?.document_storage_config;

  return (
    <PageShell
      scopeLabel="Project"
      title="Document Storage"
      subtitle="Storage configuration now follows the same simplified layout as the rest of the console."
    >
      <Card>
        <CardHeader>
          <CardTitle>Storage Backend</CardTitle>
          <CardDescription>Configure where raw project documents are stored before processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigForm
            definition={projectDocumentStorageFormDefinition}
            initialValues={{
              provider: config?.provider ?? "minio",
              endpoint: config?.endpoint ?? "",
              access_key: "",
              secret_key: "",
              bucket: config?.bucket ?? "karag",
              secure: config?.secure ?? false,
            }}
            loading={saveConfig.isPending || projectQuery.isLoading}
            onSubmit={(values) =>
              saveConfig.mutate({
                document_storage_config: { ...values, access_key: values.access_key || null, secret_key: values.secret_key || null },
              })
            }
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
