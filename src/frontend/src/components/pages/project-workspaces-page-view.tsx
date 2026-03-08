"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfigForm } from "@/components/config/config-form";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { workspaceFormDefinition } from "@/lib/form-definitions";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectWorkspacesPageView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant, workspaces } = useTenant();

  const createWorkspace = useMutation({
    mutationFn: (values: { id: string; name: string; description?: string }) =>
      platformApi.createWorkspace(
        {
          organizationId: tenant.organizationId,
          projectId: tenant.projectId,
          actorId: tenant.actorId
        },
        values
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspaces", tenant.organizationId, tenant.projectId]
      });
    }
  });

  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) =>
      platformApi.deleteWorkspace(
        {
          organizationId: tenant.organizationId,
          projectId: tenant.projectId,
          actorId: tenant.actorId
        },
        workspaceId
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspaces", tenant.organizationId, tenant.projectId]
      });
    }
  });

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Project" title="Workspaces" />

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={workspaceFormDefinition}
                loading={createWorkspace.isPending}
                onSubmit={async (values) => {
                  await createWorkspace.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <DataTable
            columns={[
              {
                key: "workspace",
                header: "Workspace",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.id}</div>
                  </div>
                )
              },
              {
                key: "description",
                header: "Description",
                render: (row) => row.description ?? "No description"
              },
              {
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.created_at)
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(generateWorkspaceUrl(row.id))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Open
                    </Button>
                    <Button
                      onClick={() => deleteWorkspace.mutate(row.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              }
            ]}
            description="Workspace list."
            rows={workspaces}
            title="Workspace directory"
          />
        </section>
      </div>
    </ProjectGuard>
  );
}
