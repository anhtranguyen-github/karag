"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useTenant } from "@/providers/tenant-provider";

export function ProjectGuard({
  children,
  description
}: {
  children: ReactNode;
  description?: string;
}) {
  const { hasProjectScope, isReady } = useTenant();

  if (!isReady) {
    return (
      <EmptyState
        description="Resolving tenant context for this route."
        title="Loading project scope"
      />
    );
  }

  if (!hasProjectScope) {
    return (
      <EmptyState
        description={
          description ??
          "Create or select an organization and project first. Project-scoped pages aggregate storage and operational views across the project's workspaces."
        }
        title="Project selection required"
      />
    );
  }

  return <>{children}</>;
}
