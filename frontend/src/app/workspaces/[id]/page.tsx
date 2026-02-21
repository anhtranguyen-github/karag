import { redirect } from 'next/navigation';

export default async function WorkspaceOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/chats/new?workspaceId=${id}`);
}
