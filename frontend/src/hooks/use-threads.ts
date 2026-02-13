import { useState, useCallback, useEffect } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface Thread {
    id: string;
    title?: string | null;
    has_thinking?: boolean;
    tags?: string[];
    updated_at?: string;
}

export function useThreads(workspaceId: string = "default") {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();

    const fetchThreads = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_ROUTES.CHAT_THREADS}?workspace_id=${encodeURIComponent(workspaceId)}`);
            if (!res.ok) {
                showError("Subsystem Unavailable", "The thread management service is currently unreachable.");
                return;
            }

            const rawData = await res.json();

            // Runtime Validation
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const { ThreadSchema } = await import('@/lib/schemas/chat');
            const { z } = await import('zod');

            const ResponseSchema = AppResponseSchema(z.array(ThreadSchema));
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation (Threads):", result.error);
                return;
            }

            const payload = result.data;
            if (payload.success && payload.data) {
                setThreads(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, showError]);

    const updateThreadTitle = async (id: string, title: string) => {
        if (!title.trim()) {
            showError("Invalid Input", "Chat title cannot be empty.");
            return;
        }

        try {
            const res = await fetch(API_ROUTES.THREAD_TITLE(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            const data = await res.json();

            if (res.ok) {
                await fetchThreads();
            } else {
                showError("Rebranding Failed", data.message || data.detail || "Unable to update synchronization descriptor.");
            }
        } catch (err) {
            console.error('Failed to update thread title:', err);
            showError("Transmission Failure", "Lost connection to neural bridge while updating thread.");
        }
    };

    const deleteThread = async (id: string) => {
        try {
            const res = await fetch(API_ROUTES.THREAD_DELETE(id), {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchThreads();
            } else {
                const data = await res.json();
                showError("Decommissioning Failed", data.message || data.detail || "Unable to purge thread memory.");
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
