import { LegacyHierarchyRedirect } from "@/components/routing/legacy-hierarchy-redirect";

export default async function LegacyProjectIntegrationsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <LegacyHierarchyRedirect projectId={projectId} projectSection="integrations" routeType="project" />;
}
