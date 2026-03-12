"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageShell from "@/components/ui/page-shell";
import { ProjectGuard } from "@/components/ui/project-guard";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectSettingsPage() {
  const { tenant, hasPermission, isPermissionsReady } = useTenant();
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = (tenant.projectId || params.projectId) as string;
  const organizationId = (tenant.organizationId || params.organizationId) as string;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", organizationId, projectId],
    queryFn: () => platformApi.getProject(tenant, organizationId, projectId),
    enabled: Boolean(organizationId && projectId),
  });

  useEffect(() => {
    if (projectQuery.data) {
      setName(projectQuery.data.name);
      setDescription(projectQuery.data.description || "");
    }
  }, [projectQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      platformApi.updateProject(tenant, organizationId, projectId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", organizationId, projectId], data);
    },
  });

  const canEdit = hasPermission("project.edit");

  return (
    <ProjectGuard>
      <PageShell
        scopeLabel="Project"
        title="Settings"
        subtitle="Project identity and metadata, using the same layout as the rest of the app."
      >
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Identifier</Label>
              <Input disabled value={projectId} />
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
          <CardFooter>
            <Button disabled={!isPermissionsReady || !canEdit || updateMutation.isPending || projectQuery.isLoading} onClick={() => updateMutation.mutate({ name, description })}>
              {!canEdit ? "Admin Access Required" : updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    </ProjectGuard>
  );
}
