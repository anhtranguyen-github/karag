import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { WorkspaceProvider } from '@/context/workspace-context';

// Mock useWorkspaces hook
vi.mock('@/hooks/use-workspaces', () => ({
    useWorkspaces: () => ({
        workspaces: [
            { id: 'default', name: 'Default Workspace', stats: { docCount: 5, threadCount: 3 } },
            { id: 'test-workspace', name: 'Test Workspace', stats: { docCount: 10, threadCount: 7 } },
        ],
        currentWorkspace: { id: 'test-workspace', name: 'Test Workspace', stats: { docCount: 10, threadCount: 7 } },
    }),
}));

function renderWithProvider(ui: React.ReactNode, workspaceId = 'test-workspace') {
    return render(
        <WorkspaceProvider workspaceId={workspaceId}>
            {ui}
        </WorkspaceProvider>
    );
}

describe('WorkspaceHeader', () => {
    it('renders workspace name', () => {
        renderWithProvider(<WorkspaceHeader />);

        // Use getAllByText since name appears multiple times
        const elements = screen.getAllByText('Test Workspace');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('shows system status', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText(/System Operational/i)).toBeInTheDocument();
    });

    it('renders search bar', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText(/Search or jump to/i)).toBeInTheDocument();
    });

    it('renders user information', () => {
        renderWithProvider(<WorkspaceHeader />);

        // User name from global mock in setup.ts
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
    });
});
