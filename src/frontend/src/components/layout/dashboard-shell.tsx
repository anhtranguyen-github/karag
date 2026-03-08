"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/search/command-palette";
import { platformApi } from "@/lib/api/platform";
import {
  buildSidebarSections,
  generateProjectUrl,
  generateWorkspaceUrl,
  matchRoute
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const route = useMemo(() => matchRoute(pathname), [pathname]);
  const { tenant, organizations, projects, workspaces, hasProjectScope, hasWorkspaceScope } =
    useTenant();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navigationItems = useMemo(
    () =>
      buildSidebarSections({
        route,
        projects,
        workspaces
      }).flatMap((section) => section.items),
    [projects, route, workspaces]
  );

  const workspaceDatasetQuery = useQuery({
    queryKey: ["command-palette", "datasets", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.listKnowledgeDatasets(tenant, tenant.workspaceId!),
    enabled: hasWorkspaceScope
  });

  const workspaceDocumentsQuery = useQuery({
    queryKey: ["command-palette", "runtime-documents", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.listRuntimeDocuments(tenant, tenant.workspaceId!),
    enabled: hasWorkspaceScope
  });

  const projectDatasetQueries = useQueries({
    queries: hasProjectScope
      ? workspaces.map((workspace) => ({
          queryKey: ["command-palette", "project-documents", tenant.projectId, workspace.id],
          queryFn: () =>
            platformApi.listKnowledgeDatasets(
              {
                ...tenant,
                workspaceId: workspace.id
              },
              workspace.id
            )
        }))
      : []
  });

  const modelsQuery = useQuery({
    queryKey: ["command-palette", "models", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listModels(tenant),
    enabled: hasProjectScope
  });

  const datasetItems = useMemo(() => {
    if (route.scope === "workspace") {
      return (workspaceDatasetQuery.data ?? []).map((dataset) => ({
        id: dataset.id,
        label: dataset.name,
        hint: "Dataset",
        href: generateWorkspaceUrl(route.workspaceId, "context-docs")
      }));
    }

    if (route.scope === "project") {
      return projectDatasetQueries.flatMap((query) =>
        (query.data ?? []).map((dataset) => ({
          id: dataset.id,
          label: dataset.name,
          hint: `Dataset in ${dataset.workspace_id}`,
          href: generateProjectUrl(route.projectId, "documents")
        }))
      );
    }

    return [];
  }, [projectDatasetQueries, route, workspaceDatasetQuery.data]);

  const documentItems = useMemo(() => {
    if (route.scope !== "workspace") {
      return [];
    }

    return (workspaceDocumentsQuery.data ?? []).slice(0, 12).map((document) => ({
      id: document.id,
      label: document.title,
      hint: "Document",
      href: generateWorkspaceUrl(route.workspaceId, "context-docs")
    }));
  }, [route, workspaceDocumentsQuery.data]);

  const entityItems = useMemo(
    () => [
      ...organizations.map((organization) => ({
        id: `org-${organization.id}`,
        label: organization.name,
        hint: "Organization",
        href: "/dashboard"
      })),
      ...projects.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        hint: "Project",
        href: generateProjectUrl(project.id)
      })),
      ...workspaces.map((workspace) => ({
        id: `workspace-${workspace.id}`,
        label: workspace.name,
        hint: "Workspace",
        href: generateWorkspaceUrl(workspace.id)
      })),
      ...(modelsQuery.data ?? []).map((model) => ({
        id: `model-${model.id}`,
        label: model.name,
        hint: `${model.framework} ${model.type}`,
        href: route.scope === "workspace" ? generateWorkspaceUrl(route.workspaceId, "rag") : route.scope === "project" ? generateProjectUrl(route.projectId) : "/dashboard"
      }))
    ],
    [modelsQuery.data, organizations, projects, route, workspaces]
  );

  const commandItems = useMemo(
    () => [
      ...navigationItems.map((item) => ({
        id: item.href,
        label: item.label,
        hint: item.description,
        href: item.href
      })),
      ...entityItems,
      ...datasetItems,
      ...documentItems
    ],
    [datasetItems, documentItems, entityItems, navigationItems]
  );

  return (
    <div className="min-h-screen bg-background">
      <Topbar onOpenSearch={() => setPaletteOpen(true)} />
      <div className="mx-auto flex max-w-[1600px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-5 xl:px-6">{children}</main>
      </div>
      <CommandPalette items={commandItems} onOpenChange={setPaletteOpen} open={paletteOpen} />
    </div>
  );
}
