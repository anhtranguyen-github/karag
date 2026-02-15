import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { WorkspaceProvider } from '@/context/workspace-context';

// Mock useWorkspaces hook
vi.mock('@/hooks/use-workspaces', () => ({
    useWorkspaces: () => ({
        workspaces: [
            { id: 'default', name: 'Default Workspace', stats: { doc_count: 5, thread_count: 3 } },
            { id: 'test-workspace', name: 'Test Workspace', stats: { doc_count: 10, thread_count: 7 } },
        ],
        currentWorkspace: { id: 'test-workspace', name: 'Test Workspace', stats: { doc_count: 10, thread_count: 7 } },
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

    it('shows workspace ID', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText(/ID: test-workspace/)).toBeInTheDocument();
    });

    it('displays document count', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText(/10 docs/)).toBeInTheDocument();
    });

    it('shows RAG engine type', () => {
        renderWithProvider(<WorkspaceHeader />);

        // Default is 'basic'
        expect(screen.getByText(/BASIC/i)).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('has exit workspace link', () => {
        renderWithProvider(<WorkspaceHeader />);

        expect(screen.getByText('Exit')).toBeInTheDocument();
    });

    it('calls onWorkspaceClick when switcher button clicked', async () => {
        const onWorkspaceClick = vi.fn();
        renderWithProvider(<WorkspaceHeader onWorkspaceClick={onWorkspaceClick} />);

        // Find the button with workspace name and click it
        const switcherButton = screen.getByTitle('Switch Workspace');
        fireEvent.click(switcherButton);

        expect(onWorkspaceClick).toHaveBeenCalledTimes(1);
    });
});
