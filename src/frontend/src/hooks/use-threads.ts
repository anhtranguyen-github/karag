import { useState, useCallback, useEffect } from 'react';
import { sdk } from '@/sdk';
import { useError } from '@/context/error-context';

export interface Thread {
    id: string;
    title?: string | null;
    has_thinking?: boolean;
    tags?: string[];
    updated_at?: string;
}

export function useThreads(workspaceId: string) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();

    const fetchThreads = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = (await sdk.chat.listThreads({
                workspaceId: workspaceId
            })) as any;
            if (payload.success && payload.data) {
                setThreads(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const updateThreadTitle = async (id: string, title: string) => {
        if (!title.trim()) {
            showError("Invalid Input", "Chat title cannot be empty.");
            return;
        }

        try {
            const payload = (await sdk.chat.updateTitle({
                workspaceId: workspaceId,
                threadId: id,
                requestBody: { title }
            })) as any;

            if (payload.success) {
                await fetchThreads();
            } else {
                showError("Rebranding Failed", "Unable to update synchronization descriptor.");
            }
        } catch (err) {
            console.error('Failed to update thread title:', err);
            showError("Transmission Failure", "Lost connection to neural bridge while updating thread.");
        }
    };

    const deleteThread = async (id: string) => {
        try {
            const payload = (await sdk.chat.deleteThread({
                workspaceId: workspaceId,
                threadId: id
            })) as any;
            if (payload.success) {
                await fetchThreads();
            } else {
                showError("Decommissioning Failed", "Unable to purge thread memory.");
            }
        } catch (err) {
            console.error('Failed to delete thread:', err);
            showError("Network Error", "The thread purge request was interrupted by a network flicker.");
        }
    };

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    return {
        threads,
        isLoading,
        refreshThreads: fetchThreads,
        updateThreadTitle,
        deleteThread
    };
}
