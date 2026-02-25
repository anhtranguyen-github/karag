'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/context/toast-context';

export interface TaskItem {
    id: string;
    type: string;
    status: string;
    progress: number;
    message: string;
    error_code: string | null;
    metadata: {
        filename?: string;
        workspace_id?: string;
        operation?: string;
        [key: string]: unknown;
    };
    workspace_id: string;
    result: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

interface TaskContextType {
    tasks: TaskItem[];
    activeTasks: TaskItem[];
    recentCompletedTasks: TaskItem[];
    failedTasks: TaskItem[];
    hasActiveWork: boolean;
    refreshTasks: (workspaceId?: string) => Promise<void>;
    retryTask: (taskId: string, workspaceId?: string) => Promise<void>;
    cancelTask: (taskId: string, workspaceId?: string) => Promise<void>;
    dismissTask: (taskId: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = 'hanachan_dismissed_tasks';

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);
    const [now, setNow] = useState(0);
    const { success: toastSuccess, error: toastError } = useToast();

    // Track status per taskId to detect transitions (completed/failed)
    const lastStatusesRef = React.useRef<Record<string, string>>({});

    // Load dismissed IDs from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const ids = JSON.parse(saved);
                if (Array.isArray(ids)) {
                    setDismissedIds(new Set(ids));
                }
            } catch (e) {
                console.error('Failed to load dismissed tasks', e);
            }
        }
        setIsStorageLoaded(true);
    }, []);

    // Save dismissed IDs to localStorage when they change
    useEffect(() => {
        if (isStorageLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
        }
    }, [dismissedIds, isStorageLoaded]);

    // Update 'now' periodically to keep filters fresh
    useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchTasks = useCallback(async (workspaceId?: string) => {
        try {
            const payload = await api.listTasksWorkspacesWorkspaceIdTasksGet({
                workspaceId: workspaceId!
            });
            if (payload.success && payload.data) {
                setTasks(payload.data || []);
            }
        } catch (_err) {
            // Silently fail polling to avoid UI noise
        }
    }, []);

    // Poll every 2 seconds
    useEffect(() => {
        fetchTasks();
        const interval = setInterval(() => fetchTasks(), 2000);
        return () => clearInterval(interval);
    }, [fetchTasks]);

    // Toast notifications on status change
    useEffect(() => {
        const nextStatuses: Record<string, string> = {};

        tasks.forEach(task => {
            const lastStatus = lastStatusesRef.current[task.id];
            if (lastStatus && lastStatus !== task.status) {
                const filename = task.metadata.filename || 'Document';
                const operation = task.metadata.operation || task.type;
                const label = operation.charAt(0).toUpperCase() + operation.slice(1).replace(/_/g, ' ');

                if (task.status === 'completed') {
                    toastSuccess(`${label} complete: ${filename}`);
                } else if (task.status === 'failed') {
                    toastError(`${label} failed: ${filename}${task.message ? ` - ${task.message}` : ''}`);
                }
            }
            nextStatuses[task.id] = task.status;
        });

        lastStatusesRef.current = nextStatuses;
    }, [tasks, toastSuccess, toastError]);

    // Derived filtered lists
    const activeTasks = useMemo(() => tasks.filter(
        t => (t.status === 'pending' || t.status === 'processing') && !dismissedIds.has(t.id)
    ), [tasks, dismissedIds]);

    const recentCompletedTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.status !== 'completed' || dismissedIds.has(t.id)) return false;
            // Show completed tasks from the last 60 seconds
            const updatedAt = new Date(t.updated_at).getTime();
            return (now - updatedAt) < 60000;
        });
    }, [tasks, dismissedIds, now]);

    const failedTasks = useMemo(() => tasks.filter(
        t => t.status === 'failed' && !dismissedIds.has(t.id)
    ), [tasks, dismissedIds]);

    const hasActiveWork = activeTasks.length > 0;

    const retryTask = useCallback(async (taskId: string, workspaceId?: string) => {
        try {
            const payload = await api.retryTaskWorkspacesWorkspaceIdTasksTaskIdRetryPost({
                workspaceId: workspaceId!,
                taskId
            });
            if (payload.success) {
                // Remove from dismissed set so it reappears when retrying
                setDismissedIds(prev => {
                    const next = new Set(prev);
                    next.delete(taskId);
                    return next;
                });
                await fetchTasks(workspaceId);
            }
        } catch (err) {
            console.error('Retry failed', err);
        }
    }, [fetchTasks]);

    const cancelTask = useCallback(async (taskId: string, workspaceId?: string) => {
        try {
            const payload = await api.cancelTaskWorkspacesWorkspaceIdTasksTaskIdCancelPost({
                workspaceId: workspaceId!,
                taskId
            });
            if (payload.success) {
                // Auto-dismiss canceled tasks to keep UI clean
                setDismissedIds(prev => {
                    const next = new Set(prev);
                    next.add(taskId);
                    return next;
                });
                await fetchTasks(workspaceId);
            }
        } catch (err) {
            console.error('Cancel failed', err);
        }
    }, [fetchTasks]);

    const dismissTask = useCallback((taskId: string) => {
        setDismissedIds(prev => {
            const next = new Set(prev);
            next.add(taskId);
            return next;
        });
    }, []);

    return (
        <TaskContext.Provider value={{
            tasks,
            activeTasks,
            recentCompletedTasks,
            failedTasks,
            hasActiveWork,
            refreshTasks: fetchTasks,
            retryTask,
            cancelTask,
            dismissTask,
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
}
