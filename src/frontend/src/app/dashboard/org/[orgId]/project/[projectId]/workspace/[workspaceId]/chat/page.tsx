import { LegacyHierarchyRedirect } from "@/components/routing/legacy-hierarchy-redirect";

export default async function LegacyWorkspaceChatPage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <LegacyHierarchyRedirect routeType="workspace" targetScope="workspace" workspaceId={workspaceId} workspaceSection="chat" />;
}
