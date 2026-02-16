import { redirect } from 'next/navigation';

export default function WorkspaceOverviewPage({ params }: { params: { id: string } }) {
    redirect(`/workspaces/${params.id}/chat`);
}
