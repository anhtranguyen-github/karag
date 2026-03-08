"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useTenant } from "@/providers/tenant-provider";

export function WorkspaceGuard({
  children,
  description
}: {
  children: ReactNode;
  description?: string;
}) {
  const { hasWorkspaceScope, isReady } = useTenant();

  if (!isReady) {
    return (
      <EmptyState
        description="Resolving tenant context for this route."
        title="Loading workspace scope"
      />
    );
  }

  if (!hasWorkspaceScope) {
    return (
      <EmptyState
        description={
          description ??
          "Create or select an organization, project, and workspace first. Workspace pages are focused on chat, context selection, and assistant configuration."
        }
        title="Workspace selection required"
      />
    );
  }

  return <>{children}</>;
}
