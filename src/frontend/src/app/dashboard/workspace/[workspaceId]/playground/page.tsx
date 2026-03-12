import { redirect } from "next/navigation";

export default function PlaygroundPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  redirect(`/dashboard/workspace/${params.workspaceId}/chat`);
}
