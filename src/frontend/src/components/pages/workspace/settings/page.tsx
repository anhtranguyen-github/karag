"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageShell from "@/components/ui/page-shell";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceSettingsPage() {
  const { tenant, workspaces, hasPermission, isPermissionsReady } = useTenant();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workspaceId = params.workspaceId as string;
  const workspace = workspaces.find((entry) => entry.id === workspaceId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const workspaceQuery = useQuery({
    queryKey: ["workspace", tenant.organizationId, tenant.projectId, workspaceId],
    queryFn: () => platformApi.getWorkspace(tenant, workspaceId),
    enabled: Boolean(tenant.organizationId && tenant.projectId && workspaceId),
  });

  useEffect(() => {
    const currentWorkspace = workspaceQuery.data ?? workspace;
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || "");
    }
  }, [workspace, workspaceQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      platformApi.updateWorkspace(tenant, workspaceId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["workspace", tenant.organizationId, tenant.projectId, workspaceId], data);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => platformApi.deleteWorkspace(tenant, workspaceId),
    onSuccess: () => router.push(`/dashboard/project/${tenant.projectId}`),
  });

  const canEdit = hasPermission("workspace.edit");
  const canDelete = hasPermission("workspace.delete");

  return (
    <WorkspaceGuard>
      <PageShell
        scopeLabel="Workspace"
        title="Settings"
        subtitle="A simplified settings page for the workspace identity and lifecycle."
      >
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Identifier</Label>
              <Input disabled value={workspaceId} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input disabled={!canEdit} onChange={(event) => setName(event.target.value)} value={name} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea disabled={!canEdit} className="min-h-32" onChange={(event) => setDescription(event.target.value)} value={description} />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button disabled={!isPermissionsReady || !canEdit || updateMutation.isPending} onClick={() => updateMutation.mutate({ name, description })}>
              {!canEdit ? "Edit Access Required" : updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            {canDelete ? (
              <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} variant="destructive">
                Delete Workspace
              </Button>
            ) : null}
          </CardFooter>
        </Card>
      </PageShell>
    </WorkspaceGuard>
  );
}
