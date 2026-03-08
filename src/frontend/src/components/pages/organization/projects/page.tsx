"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ConfigForm } from "@/components/config/config-form";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { platformApi } from "@/lib/api/platform";
import { projectFormDefinition } from "@/lib/form-definitions";
import { generateProjectUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationProjectsPageView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant, organizations, projects } = useTenant();
  const [search, setSearch] = useState("");

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
      <div className="mx-auto w-full max-w-6xl py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <button
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 transition"
            onClick={() => {
              document.getElementById("create-project-form")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            + New project
          </button>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <input
            className="w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="Search for a project"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-slate-500 text-sm">Status</span>
          <span className="text-slate-500 text-sm">Sorted by name</span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
              No projects found.
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between min-h-[160px]"
                onClick={() => router.push(generateProjectUrl(project.id))}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-slate-900">{project.name}</span>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-100">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">Standard Project</div>
                  <div className="text-xs text-slate-400 font-mono">{project.id}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                    NANO
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-12 max-w-md mx-auto" id="create-project-form">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Create new project</h2>
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
    </OrganizationGuard>
  );
}
