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
      <div className="grid gap-6">
        <PageHeader eyebrow="Organization" title={organization?.name ?? "Projects"} />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Projects" value={projects.length} />
          <MetricCard label="Members" value="Org" />
          <MetricCard label="Scope" value="Projects" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create project</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={projectFormDefinition}
                loading={createProject.isPending}
                onSubmit={async (values) => {
                  await createProject.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <DataTable
            actions={
              <div className="min-w-[260px]">
                <TextInput
                  label="Search projects"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search project name or ID"
                  value={search}
                />
              </div>
            }
            columns={[
              {
                key: "project",
                header: "Project",
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
                header: "Open",
                render: (row) => (
                  <Button
                    onClick={() => router.push(generateProjectUrl(row.id))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Open
                  </Button>
                )
              }
            ]}
            description="Project list."
            rows={filteredProjects}
            title="Projects"
          />
        </section>
      </div>
    </OrganizationGuard>
  );
}
