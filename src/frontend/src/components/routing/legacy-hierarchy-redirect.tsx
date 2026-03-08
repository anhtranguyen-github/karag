"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { platformApi } from "@/lib/api/platform";
import {
  buildOrgPath,
  generateProjectUrl,
  generateWorkspaceUrl,
  type ProjectSection,
  type WorkspaceSection
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

type LegacyHierarchyRedirectProps =
  | {
      routeType: "project";
      projectId: string;
      projectSection?: ProjectSection;
    }
  | {
      routeType: "workspace";
      workspaceId: string;
      targetScope: "project" | "workspace";
      projectSection?: ProjectSection;
      workspaceSection?: WorkspaceSection;
    };

export function LegacyHierarchyRedirect(props: LegacyHierarchyRedirectProps) {
  const router = useRouter();
  const { tenant } = useTenant();

  useEffect(() => {
    let cancelled = false;

    async function resolveAndRedirect() {
      if (props.routeType === "project") {
        const organizations = await platformApi.listOrganizations();
        for (const organization of organizations) {
          const projects = await platformApi.listProjects(organization.id);
          const project = projects.find((entry) => entry.id === props.projectId);
          if (project && !cancelled) {
            router.replace(generateProjectUrl(props.projectId, props.projectSection ?? "overview"));
            return;
          }
        }
      }

      if (props.routeType === "workspace") {
        const organizations = await platformApi.listOrganizations();
        for (const organization of organizations) {
          const projects = await platformApi.listProjects(organization.id);
          for (const project of projects) {
            const workspaces = await platformApi.listWorkspaces({
              organizationId: organization.id,
              projectId: project.id,
              actorId: tenant.actorId
            });
            const workspace = workspaces.find((entry) => entry.id === props.workspaceId);
            if (workspace && !cancelled) {
              if (props.targetScope === "project") {
                router.replace(generateProjectUrl(project.id, props.projectSection ?? "overview"));
                return;
              }

              router.replace(
                generateWorkspaceUrl(props.workspaceId, props.workspaceSection ?? "overview")
              );
              return;
            }
          }
        }
      }

      if (!cancelled) {
        router.replace(buildOrgPath());
      }
    }

    void resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [props, router, tenant.actorId]);

  return <EmptyState description="Redirecting to the current route." title="Redirecting" />;
}
