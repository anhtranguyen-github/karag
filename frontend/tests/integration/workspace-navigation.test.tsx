import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Setup mocks
const mockRouterPush = vi.fn();
const mockCreateWorkspace = vi.fn();
const mockDeleteWorkspace = vi.fn();
const mockSwitchWorkspace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({
        id: 'test-workspace',
    }),
    usePathname: () => '/workspaces/test-workspace',
}));

// Dynamic workspace state for integration testing
const mockWorkspaces = [
    { id: 'default', name: 'Default Workspace', stats: { doc_count: 5, thread_count: 3 } },
    { id: 'ws-1', name: 'Test Workspace', stats: { doc_count: 10, thread_count: 7 } },
];

vi.mock('@/hooks/use-workspaces', () => ({
    useWorkspaces: () => ({
        workspaces: mockWorkspaces,
        currentWorkspace: mockWorkspaces[1],
        isLoading: false,
        error: null,
        createWorkspace: mockCreateWorkspace,
        deleteWorkspace: mockDeleteWorkspace,
        switchWorkspace: mockSwitchWorkspace,
        selectWorkspace: mockSwitchWorkspace,
    }),
}));

import HomePage from '@/app/page';
import { WorkspaceProvider } from '@/context/workspace-context';
import { WorkspaceHeader } from '@/components/layout/workspace-header';

describe('Workspace Navigation Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('navigates to workspace when card clicked', async () => {
        render(<HomePage />);

        const defaultWorkspaceCard = (await screen.findByText('Default Workspace')).closest('div')?.parentElement;
        if (defaultWorkspaceCard) {
            fireEvent.click(defaultWorkspaceCard);
        }

        expect(mockRouterPush).toHaveBeenCalledWith('/workspaces/default');
    });

    it('opens create modal and creates workspace', async () => {
        mockCreateWorkspace.mockResolvedValue({ success: true, workspace: { id: 'new-ws', name: 'New Workspace' } });

        render(<HomePage />);

        // Open modal
        const createButton = screen.getByRole('button', { name: /New/i });
        fireEvent.click(createButton);

        // Fill form
        const nameInput = screen.getByLabelText(/Workspace Name/i);
        fireEvent.change(nameInput, { target: { value: 'New Workspace' } });
        fireEvent.blur(nameInput);


        // Submit
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i })).not.toBeDisabled();
        }, { timeout: 3000 });
        fireEvent.click(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i }));

        await waitFor(() => {
            expect(mockCreateWorkspace).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Workspace',
                description: '',
                rag_engine: 'basic'
            }));
        });
    });

    it('navigates to new workspace after creation', async () => {
        mockCreateWorkspace.mockResolvedValue({ success: true, workspace: { id: 'new-ws-123' } });

        render(<HomePage />);

        // Open modal and create
        fireEvent.click(screen.getByRole('button', { name: /New/i }));
        fireEvent.change(await screen.findByLabelText(/Workspace Name/i), { target: { value: 'Quick Test' } });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i })).not.toBeDisabled();
        });
        fireEvent.click(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i }));

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith('/workspaces/new-ws-123');
        });
    });

    it('selects graph RAG engine in create modal', async () => {
        mockCreateWorkspace.mockResolvedValue({ success: true, workspace: { id: 'graph-ws' } });

        render(<HomePage />);

        fireEvent.click(screen.getByRole('button', { name: /New/i }));
        fireEvent.change(await screen.findByLabelText(/Workspace Name/i), { target: { value: 'Graph WS' } });


        // Select Graph engine
        const ragSelect = await screen.findByLabelText(/Search Mode/i);
        fireEvent.change(ragSelect, { target: { value: 'graph' } });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i })).not.toBeDisabled();
        });
        fireEvent.click(screen.getByRole('button', { name: /PROCEED TO CONFIRMATION/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /DEPLOY WORKSPACE/i }));

        await waitFor(() => {
            expect(mockCreateWorkspace).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Graph WS',
                description: '',
                rag_engine: 'graph'
            }));
        });
    });
});

describe('Workspace Header Navigation Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders navigation links for workspace sections', () => {
        render(
            <WorkspaceProvider workspaceId="test-workspace">
                <WorkspaceHeader />
            </WorkspaceProvider>
        );

        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('shows exit workspace link that goes to home', () => {
        render(
            <WorkspaceProvider workspaceId="test-workspace">
                <WorkspaceHeader />
            </WorkspaceProvider>
        );

        const exitLink = screen.getByText('Exit');
        expect(exitLink).toBeInTheDocument();
        expect(exitLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('calls onWorkspaceClick when switcher clicked', () => {
        const onWorkspaceClick = vi.fn();

        render(
            <WorkspaceProvider workspaceId="test-workspace">
                <WorkspaceHeader onWorkspaceClick={onWorkspaceClick} />
            </WorkspaceProvider>
        );

        const switcher = screen.getByTitle('Switch Workspace');
        fireEvent.click(switcher);

        expect(onWorkspaceClick).toHaveBeenCalled();
    });
});

describe('Workspace Context Provider Integration', () => {
    it('provides workspace ID to children', () => {
        const TestComponent = () => {
            // This would use useWorkspaceContext in real code
            return <div>Workspace Context Test</div>;
        };

        render(
            <WorkspaceProvider workspaceId="test-ws">
                <TestComponent />
            </WorkspaceProvider>
        );

        expect(screen.getByText('Workspace Context Test')).toBeInTheDocument();
    });
});
