"use client";

import { useQuery } from "@tanstack/react-query";
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
  const { tenant, organizations, projects, workspaces, hasWorkspaceScope } =
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

  const workspaceDocumentsQuery = useQuery({
    queryKey: ["command-palette", "runtime-documents", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.listRuntimeDocuments(tenant, tenant.workspaceId!),
    enabled: hasWorkspaceScope && paletteOpen
  });

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
      }))
    ],
    [organizations, projects, workspaces]
  );

  const commandItems = useMemo(
    () => [
      ...navigationItems.map((nav) => ({
        id: nav.href,
        label: nav.label,
        hint: nav.description,
        href: nav.href
      })),
      ...entityItems,
      ...documentItems
    ],
    [documentItems, entityItems, navigationItems]
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
