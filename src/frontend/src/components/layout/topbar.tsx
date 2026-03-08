"use client";

import { ChevronDown, Command, Search, UserCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  buildOrgPath,
  generateProjectUrl,
  generateWorkspaceUrl,
  matchRoute,
  type ProjectSection,
  type WorkspaceSection
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

function Selector({
  ariaLabel,
  options,
  value,
  onChange,
  placeholder,
  disabled = false
}: {
  ariaLabel: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative min-w-[180px]">
      <select
        aria-label={ariaLabel}
        className="h-9 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {!value ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const route = matchRoute(pathname);
  const {
    tenant,
    organizations,
    projects,
    workspaces,
    setOrganizationId,
    setProjectId,
    setWorkspaceId
  } = useTenant();

  const currentProjectSection: ProjectSection = route.scope === "project" ? route.section : "overview";
  const currentWorkspaceSection: WorkspaceSection =
    route.scope === "workspace" ? route.section : "overview";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 lg:px-6 xl:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 pt-1">
          <Selector
            ariaLabel="Switch organization"
            onChange={(nextOrgId) => {
              if (!nextOrgId) {
                return;
              }

              setOrganizationId(nextOrgId);
              router.push(buildOrgPath(nextOrgId));
            }}
            options={organizations.map((organization) => ({
              label: organization.name,
              value: organization.id
            }))}
            placeholder="Organization"
            value={tenant.organizationId ?? ""}
          />
          <Selector
            ariaLabel="Switch project"
            disabled={!projects.length}
            onChange={(nextProjectId) => {
              if (!nextProjectId) {
                return;
              }

              setProjectId(nextProjectId);
              if (route.scope === "project") {
                router.push(generateProjectUrl(nextProjectId, currentProjectSection));
                return;
              }

              router.push(generateProjectUrl(nextProjectId));
            }}
            options={projects.map((project) => ({
              label: project.name,
              value: project.id
            }))}
            placeholder="Project"
            value={tenant.projectId ?? ""}
          />
          <Selector
            ariaLabel="Switch workspace"
            disabled={!workspaces.length}
            onChange={(nextWorkspaceId) => {
              if (!nextWorkspaceId) {
                return;
              }

              setWorkspaceId(nextWorkspaceId);
              if (route.scope === "workspace") {
                router.push(generateWorkspaceUrl(nextWorkspaceId, currentWorkspaceSection));
                return;
              }

              router.push(generateWorkspaceUrl(nextWorkspaceId));
            }}
            options={workspaces.map((workspace) => ({
              label: workspace.name,
              value: workspace.id
            }))}
            placeholder="Workspace"
            value={tenant.workspaceId ?? ""}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="min-w-[180px] justify-between"
            onClick={onOpenSearch}
            size="sm"
            variant="outline"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Command className="h-3 w-3" />K
            </span>
          </Button>

          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 shadow-sm">
            <UserCircle2 className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">
              {tenant.actorId ?? "dashboard-user"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
