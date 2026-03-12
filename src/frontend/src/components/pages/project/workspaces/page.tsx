"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/ui/page-shell";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectWorkspacesPageView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant, workspaces, setWorkspaceId, hasPermission, isPermissionsReady } = useTenant();
  const [search, setSearch] = useState("");
  const canCreateWorkspace = hasPermission("workspace.create");
  const canDeleteWorkspace = hasPermission("workspace.delete");

  const filteredWorkspaces = useMemo(
    () =>
      workspaces.filter((workspace) =>
        [workspace.name, workspace.id, workspace.description ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())
      ),
    [search, workspaces]
  );

  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) =>
      platformApi.deleteWorkspace(
        { organizationId: tenant.organizationId, projectId: tenant.projectId, actorId: tenant.actorId },
        workspaceId
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces", tenant.organizationId, tenant.projectId] });
    },
  });

  return (
    <ProjectGuard>
      <PageShell
        scopeLabel="Project"
        title="Workspaces"
        subtitle="All workspaces in one simple list, with direct open and delete actions."
      >
        <div className="app-panel flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search workspaces" value={search} />
          </div>
          <Button className="gap-2" disabled={!isPermissionsReady || !canCreateWorkspace} onClick={() => router.push("/dashboard/new/workspace")}>
            <Plus className="h-4 w-4" />
            {canCreateWorkspace ? "New Workspace" : "Create Access Required"}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredWorkspaces.map((workspace) => (
            <Card className="cursor-pointer" key={workspace.id} onClick={() => {
              setWorkspaceId(workspace.id);
              router.push(`/dashboard/workspace/${workspace.id}`);
            }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>{workspace.description || workspace.id}</CardDescription>
                  </div>
                  {canDeleteWorkspace ? (
                    <button
                      className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (confirm("Delete this workspace?")) {
                          deleteWorkspace.mutate(workspace.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="status-pill status-pill--healthy">{workspace.status}</span>
                <span className="text-sm font-medium text-primary">Open</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    </ProjectGuard>
  );
}
