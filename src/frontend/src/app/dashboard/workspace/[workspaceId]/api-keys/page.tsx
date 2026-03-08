import { LegacyHierarchyRedirect } from "@/components/routing/legacy-hierarchy-redirect";

export default async function LegacyWorkspaceApiKeysPage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <LegacyHierarchyRedirect
      projectSection="settings"
      routeType="workspace"
      targetScope="project"
      workspaceId={workspaceId}
    />
  );
}
