"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ConfigForm } from "@/components/config/config-form";
import { TextInput } from "@/components/inputs/text-input";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { PageHeader } from "@/components/ui/page-header";
import { platformApi } from "@/lib/api/platform";
import { projectFormDefinition } from "@/lib/form-definitions";
import { generateProjectUrl } from "@/lib/navigation";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationProjectsPageView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant, organizations, projects } = useTenant();
  const [search, setSearch] = useState("");
  const organization = organizations.find((entry) => entry.id === tenant.organizationId);

  const createProject = useMutation({
    mutationFn: (values: { id: string; name: string; description?: string }) =>
      platformApi.createProject(tenant.organizationId!, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", tenant.organizationId] });
    }
  });

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        [project.name, project.id, project.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [projects, search]
  );

  return (
    <OrganizationGuard>
      <div className="min-h-screen bg-[#18181b] px-0 py-0">
        <div className="mx-auto w-full max-w-6xl pt-10">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <button
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 transition"
              onClick={() => {
                // Open a modal or scroll to create form (for now, scroll)
                document.getElementById('create-project-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              + New project
            </button>
          </div>
          <div className="mb-6 flex items-center gap-3">
            <input
              className="w-full max-w-xs rounded-md border border-slate-700 bg-[#232329] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-green-600 focus:outline-none"
              placeholder="Search for a project"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="text-slate-400 text-sm">Status</span>
            <span className="text-slate-400 text-sm">Sorted by name</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-[#232329] p-10 text-center text-slate-400">
                No projects found.
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-700 bg-[#232329] p-6 shadow hover:shadow-lg transition cursor-pointer flex flex-col justify-between min-h-[160px]"
                  onClick={() => router.push(generateProjectUrl(project.id))}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">{project.name}</span>
                      <span className="inline-flex items-center rounded-full bg-green-900/30 px-3 py-1 text-xs font-medium text-green-400 border border-green-800">ACTIVE</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">AWS | ap-southeast-1</div>
                    <div className="text-xs text-slate-500">{project.id}</div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">NANO</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-12 max-w-md mx-auto" id="create-project-form">
            <div className="rounded-xl border border-slate-700 bg-[#232329] p-8">
              <h2 className="text-lg font-semibold text-white mb-4">Create new project</h2>
              <ConfigForm
                definition={projectFormDefinition}
                loading={createProject.isPending}
                onSubmit={async (values) => {
                  await createProject.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </div>
          </div>
        </div>
      </div>
    </OrganizationGuard>
  );
}
