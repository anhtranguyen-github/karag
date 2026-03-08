"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { platformApi } from "@/lib/api/platform";
import { matchRoute } from "@/lib/navigation";
import type {
  OrganizationSummary,
  ProjectSummary,
  TenantSelection,
  WorkspaceSummary
} from "@/lib/types/platform";

const STORAGE_KEY = "karag.tenant.selection";
const DEFAULT_TENANT: TenantSelection = { actorId: "dashboard-user" };

type TenantContextValue = {
  tenant: TenantSelection;
  organizations: OrganizationSummary[];
  projects: ProjectSummary[];
  workspaces: WorkspaceSummary[];
  setOrganizationId: (value: string) => void;
  setProjectId: (value: string) => void;
  setWorkspaceId: (value: string) => void;
  setActorId: (value: string) => void;
  isReady: boolean;
  hasOrganizationScope: boolean;
  hasProjectScope: boolean;
  hasWorkspaceScope: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

function readStoredSelection(): TenantSelection {
  if (typeof window === "undefined") {
    return DEFAULT_TENANT;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_TENANT;
    }

    const parsed = JSON.parse(raw) as TenantSelection;
    return { ...DEFAULT_TENANT, ...parsed };
  } catch {
    return DEFAULT_TENANT;
  }
}

async function resolveProjectContext(projectId: string) {
  const organizations = await platformApi.listOrganizations();

  for (const organization of organizations) {
    const projects = await platformApi.listProjects(organization.id);
    const project = projects.find((entry) => entry.id === projectId);
    if (project) {
      return {
        organizationId: organization.id,
        projectId
      } satisfies TenantSelection;
    }
  }

  return null;
}

async function resolveWorkspaceContext(workspaceId: string, actorId: string) {
  const organizations = await platformApi.listOrganizations();

  for (const organization of organizations) {
    const projects = await platformApi.listProjects(organization.id);

    for (const project of projects) {
      const workspaces = await platformApi.listWorkspaces({
        organizationId: organization.id,
        projectId: project.id,
        actorId
      });
      const workspace = workspaces.find((entry) => entry.id === workspaceId);
      if (workspace) {
        return {
          organizationId: organization.id,
          projectId: project.id,
          workspaceId
        } satisfies TenantSelection;
      }
    }
  }

  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const route = useMemo(() => matchRoute(pathname), [pathname]);
  const [tenant, setTenant] = useState<TenantSelection>(DEFAULT_TENANT);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const [routeResolved, setRouteResolved] = useState(false);

  useEffect(() => {
    setTenant(readStoredSelection());
    setHasHydratedSelection(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedSelection) {
      return;
    }

    let cancelled = false;

    async function syncRouteSelection() {
      if (route.scope === "project") {
        setRouteResolved(false);
        const resolved = await resolveProjectContext(route.projectId);
        if (cancelled) {
          return;
        }

        if (resolved) {
          setTenant((current) => ({
            ...current,
            ...resolved,
            workspaceId: undefined
          }));
        }

        setRouteResolved(true);
        return;
      }

      if (route.scope === "workspace") {
        setRouteResolved(false);
        const resolved = await resolveWorkspaceContext(
          route.workspaceId,
          tenant.actorId ?? DEFAULT_TENANT.actorId!
        );
        if (cancelled) {
          return;
        }

        if (resolved) {
          setTenant((current) => ({
            ...current,
            ...resolved
          }));
        }

        setRouteResolved(true);
        return;
      }

      setRouteResolved(true);
    }

    void syncRouteSelection();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedSelection, route, tenant.actorId]);

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: platformApi.listOrganizations,
    enabled: hasHydratedSelection
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", tenant.organizationId],
    queryFn: () => platformApi.listProjects(tenant.organizationId!),
    enabled: Boolean(hasHydratedSelection && tenant.organizationId)
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces", tenant.organizationId, tenant.projectId],
    queryFn: () =>
      platformApi.listWorkspaces({
        organizationId: tenant.organizationId,
        projectId: tenant.projectId,
        actorId: tenant.actorId
      }),
    enabled: Boolean(hasHydratedSelection && tenant.organizationId && tenant.projectId)
  });

  useEffect(() => {
    if (typeof window !== "undefined" && hasHydratedSelection) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
    }
  }, [hasHydratedSelection, tenant]);

  useEffect(() => {
    const organizations = organizationsQuery.data ?? [];
    if (!organizations.length) {
      return;
    }

    if (!tenant.organizationId || !organizations.some((item) => item.id === tenant.organizationId)) {
      setTenant((current) => ({
        ...current,
        organizationId: organizations[0]?.id,
        projectId: undefined,
        workspaceId: undefined
      }));
    }
  }, [organizationsQuery.data, tenant.organizationId]);

  useEffect(() => {
    if (route.scope === "project" || route.scope === "workspace") {
      return;
    }

    const projects = projectsQuery.data ?? [];
    if (!tenant.organizationId || !projects.length) {
      return;
    }

    if (!tenant.projectId || !projects.some((item) => item.id === tenant.projectId)) {
      setTenant((current) => ({
        ...current,
        projectId: projects[0]?.id,
        workspaceId: undefined
      }));
    }
  }, [projectsQuery.data, route.scope, tenant.organizationId, tenant.projectId]);

  useEffect(() => {
    if (route.scope === "workspace") {
      return;
    }

    const workspaces = workspacesQuery.data ?? [];
    if (!tenant.organizationId || !tenant.projectId || !workspaces.length) {
      return;
    }

    if (!tenant.workspaceId || !workspaces.some((item) => item.id === tenant.workspaceId)) {
      setTenant((current) => ({
        ...current,
        workspaceId: workspaces[0]?.id
      }));
    }
  }, [route.scope, tenant.organizationId, tenant.projectId, tenant.workspaceId, workspacesQuery.data]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      organizations: organizationsQuery.data ?? [],
      projects: projectsQuery.data ?? [],
      workspaces: workspacesQuery.data ?? [],
      setOrganizationId: (organizationId) =>
        setTenant((current) => ({
          ...current,
          organizationId,
          projectId: undefined,
          workspaceId: undefined
        })),
      setProjectId: (projectId) =>
        setTenant((current) => ({
          ...current,
          projectId,
          workspaceId: undefined
        })),
      setWorkspaceId: (workspaceId) =>
        setTenant((current) => ({
          ...current,
          workspaceId
        })),
      setActorId: (actorId) =>
        setTenant((current) => ({
          ...current,
          actorId
        })),
      isReady:
        hasHydratedSelection &&
        routeResolved &&
        organizationsQuery.isFetched &&
        (!tenant.organizationId || projectsQuery.isFetched) &&
        (!tenant.projectId || workspacesQuery.isFetched),
      hasOrganizationScope: Boolean(tenant.organizationId),
      hasProjectScope: Boolean(tenant.organizationId && tenant.projectId),
      hasWorkspaceScope: Boolean(
        tenant.organizationId && tenant.projectId && tenant.workspaceId
      )
    }),
    [
      hasHydratedSelection,
      organizationsQuery.data,
      organizationsQuery.isFetched,
      projectsQuery.data,
      projectsQuery.isFetched,
      routeResolved,
      tenant,
      workspacesQuery.data,
      workspacesQuery.isFetched
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used inside TenantProvider.");
  }

  return context;
}
