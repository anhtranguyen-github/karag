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
  const { tenant, organizations, projects, workspaces, hasWorkspaceScope, isReady } =
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
    enabled: isReady && hasWorkspaceScope && paletteOpen
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
    <div className="app-frame bg-background text-foreground font-body">
      <Sidebar aria-label="Main sidebar" />
      <main className="ml-64 min-h-screen flex flex-col animate-fade-in">
        <Topbar onOpenSearch={() => setPaletteOpen(true)} />
        <div className="flex-1 w-full mx-auto">
          {children}
        </div>
      </main>
      <CommandPalette items={commandItems} onOpenChange={setPaletteOpen} open={paletteOpen} />
    </div>
  );
}
