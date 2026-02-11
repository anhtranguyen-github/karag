'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_ROUTES } from '@/lib/api-config';

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
    refreshTasks: () => Promise<void>;
    retryTask: (taskId: string) => Promise<void>;
    cancelTask: (taskId: string) => Promise<void>;
    dismissTask: (taskId: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = 'hanachan_dismissed_tasks';

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);
    const notifiedFailures = useRef<Set<string>>(new Set());

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

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(API_ROUTES.TASKS);
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
            }
        } catch (err) {
            // Silently fail polling to avoid UI noise
        }
    }, []);

    // Poll every 2 seconds
    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 2000);
        return () => clearInterval(interval);
    }, [fetchTasks]);

    // Derived filtered lists
    const activeTasks = tasks.filter(
        t => (t.status === 'pending' || t.status === 'processing') && !dismissedIds.has(t.id)
    );

    const recentCompletedTasks = tasks.filter(t => {
        if (t.status !== 'completed' || dismissedIds.has(t.id)) return false;
        // Show completed tasks from the last 60 seconds
        const updatedAt = new Date(t.updated_at).getTime();
        const now = Date.now();
        return (now - updatedAt) < 60000;
    });

    const failedTasks = tasks.filter(
        t => t.status === 'failed' && !dismissedIds.has(t.id)
    );

    const hasActiveWork = activeTasks.length > 0;

    const retryTask = useCallback(async (taskId: string) => {
        try {
            const res = await fetch(`${API_ROUTES.TASKS}${taskId}/retry`, { method: 'POST' });
            if (res.ok) {
                // Remove from dismissed set so it reappears when retrying
                setDismissedIds(prev => {
                    const next = new Set(prev);
                    next.delete(taskId);
                    return next;
                });
                await fetchTasks();
            }
        } catch (err) {
            console.error('Retry failed', err);
        }
    }, [fetchTasks]);

    const cancelTask = useCallback(async (taskId: string) => {
        try {
            const res = await fetch(`${API_ROUTES.TASKS}${taskId}/cancel`, { method: 'POST' });
            if (res.ok) {
                // Auto-dismiss canceled tasks to keep UI clean
                setDismissedIds(prev => {
                    const next = new Set(prev);
                    next.add(taskId);
                    return next;
                });
                await fetchTasks();
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
