import { LegacyHierarchyRedirect } from "@/components/routing/legacy-hierarchy-redirect";

export default async function LegacyWorkspaceModelsPage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <LegacyHierarchyRedirect
      projectSection="integrations"
      routeType="workspace"
      targetScope="project"
      workspaceId={workspaceId}
    />
  );
}
