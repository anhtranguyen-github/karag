"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PrimaryButton } from "@/components/ui/primary-button";
import { ProjectGuard } from "@/components/ui/project-guard";
import { ResourceCard, type ResourceCardItem } from "@/components/ui/resource-card";
import { ResourceGrid, ResourceToolbar } from "@/components/ui/resource-toolbar";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectWorkspacesPageView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant, workspaces, setWorkspaceId } = useTenant();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredWorkspaces: ResourceCardItem[] = useMemo(
    () =>
      workspaces
        .filter((w) =>
          [w.name, w.id, w.description ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description || "No description provided.",
          status: w.status,
          href: `/dashboard/workspace/${w.id}`,
        })),
    [workspaces, search]
  );

  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) =>
      platformApi.deleteWorkspace(
        {
          organizationId: tenant.organizationId,
          projectId: tenant.projectId,
          actorId: tenant.actorId,
        },
        workspaceId
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspaces", tenant.organizationId, tenant.projectId],
      });
    },
  });

  return (
    <ProjectGuard>
      <div className="mx-auto w-full max-w-6xl py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#e5e5e5]">Workspaces</h1>
          <PrimaryButton onClick={() => router.push("/dashboard/new/workspace")}>
            New workspace
          </PrimaryButton>
        </div>

        <ResourceToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search for a workspace"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ResourceGrid
          viewMode={viewMode}
          isEmpty={filteredWorkspaces.length === 0}
          emptyLabel="No workspaces found."
        >
          {filteredWorkspaces.map((item) => (
            <ResourceCard
              item={item}
              key={item.id}
              onClick={() => {
                setWorkspaceId(item.id);
                router.push(item.href);
              }}
              actionButton={
                <button
                  className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6b7280] opacity-0 transition-all hover:bg-[#2a2a2a] hover:text-red-400 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this workspace?")) {
                      deleteWorkspace.mutate(item.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          ))}
        </ResourceGrid>
      </div>
    </ProjectGuard>
  );
}
