"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { OrganizationGuard } from "@/components/ui/organization-guard";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ResourceCard, type ResourceCardItem } from "@/components/ui/resource-card";
import { ResourceGrid, ResourceToolbar } from "@/components/ui/resource-toolbar";
import { generateProjectUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationProjectsPageView() {
  const router = useRouter();
  const { projects } = useTenant();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredProjects: ResourceCardItem[] = useMemo(
    () =>
      projects
        .filter((project) =>
          [project.name, project.id, project.description ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          href: generateProjectUrl(project.id),
        })),
    [projects, search]
  );

  return (
    <OrganizationGuard>
      <div className="mx-auto w-full max-w-6xl py-6 px-4 animate-in fade-in duration-700">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-[#f8fafc]">Projects</h1>
            <p className="text-[#94a3b8] font-medium italic">Active namespaces for cognitive deployments.</p>
          </div>
          <PrimaryButton onClick={() => router.push("/dashboard/new/project")} className="h-11 px-8 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/10 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
            Create Project
          </PrimaryButton>
        </div>

        <ResourceToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search for a project"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ResourceGrid
          viewMode={viewMode}
          isEmpty={filteredProjects.length === 0}
          emptyLabel="No projects found."
        >
          {filteredProjects.map((item) => (
            <ResourceCard item={item} key={item.id} />
          ))}
        </ResourceGrid>
      </div>
    </OrganizationGuard>
  );
}
