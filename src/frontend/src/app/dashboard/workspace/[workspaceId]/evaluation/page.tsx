import { LegacyHierarchyRedirect } from "@/components/routing/legacy-hierarchy-redirect";

export default async function LegacyWorkspaceEvaluationPage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <LegacyHierarchyRedirect
      projectSection="observability"
      routeType="workspace"
      targetScope="project"
      workspaceId={workspaceId}
    />
  );
}
