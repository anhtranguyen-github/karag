"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useTenant } from "@/providers/tenant-provider";

export function OrganizationGuard({
  children,
  description
}: {
  children: ReactNode;
  description?: string;
}) {
  const { hasOrganizationScope, isReady } = useTenant();

  if (!isReady) {
    return (
      <EmptyState
        description="Resolving organization context for this route."
        title="Loading organization scope"
      />
    );
  }

  if (!hasOrganizationScope) {
    return (
      <EmptyState
        description={
          description ??
          "Create or select an organization first. Organization scope is the entry point for browsing projects and managing top-level access."
        }
        title="Organization selection required"
      />
    );
  }

  return <>{children}</>;
}
