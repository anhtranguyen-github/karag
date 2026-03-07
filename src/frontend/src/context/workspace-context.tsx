'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkspaces, Workspace } from '@/hooks/use-workspaces';

interface WorkspaceContextType {
    currentWorkspace: Workspace | null;
    workspaceId: string;
    isDefault: boolean;
    ragEngine: string;
    documentCount: number;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspaceContext() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) {
        throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
    }
    return ctx;
}

interface WorkspaceProviderProps {
    workspaceId: string;
    children: ReactNode;
}

export function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
    const { workspaces, currentWorkspace } = useWorkspaces();

    const ws = workspaces.find(w => w.id === workspaceId) || currentWorkspace;

    // Type assertion for workspace with settings
    interface WorkspaceWithSettings extends Workspace {
        settings?: { rag_engine?: string };
    }
    const wsWithSettings = ws as WorkspaceWithSettings | null;

    const value: WorkspaceContextType = {
        currentWorkspace: ws || null,
        workspaceId,
        isDefault: workspaceId === 'default',
        ragEngine: wsWithSettings?.settings?.rag_engine || 'basic',
        documentCount: ws?.stats?.doc_count || 0,
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
}
