import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { workspaces } from '@/sdk/workspaces';

// Setup mocks
const mockRouterPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: vi.fn(),
        back: vi.fn(),
        refresh: mockRefresh,
    }),
    useParams: () => ({
        id: 'test-workspace',
    }),
    usePathname: () => '/workspaces/test-workspace',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/sdk/workspaces', () => ({
    workspaces: {
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        getDetails: vi.fn(),
        getGraph: vi.fn(),
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
        getSettingsMetadata: vi.fn(),
    },
}));

import HomePage from '@/app/page';
import { ErrorProvider } from '@/context/error-context';

describe('Workspace Navigation Integration', () => {
    const mockWorkspaces = [
        { id: 'default', name: 'Default Workspace', description: 'Test desc 1' },
        { id: 'ws-1', name: 'Test Workspace', description: 'Test desc 2' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        (workspaces.list as any).mockResolvedValue({ data: mockWorkspaces });
    });

    it('navigates to workspace when card clicked', async () => {
        render(
            <ErrorProvider>
                <HomePage />
            </ErrorProvider>
        );

        const card = await screen.findByText(/Default Workspace/i);
        fireEvent.click(card);

        expect(mockRouterPush).toHaveBeenCalled();
        // The actual URL in page.tsx is /chats/new?workspaceId=... 
        expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('workspaceId=default'));
    });

    it('opens create modal and creates workspace', async () => {

        (workspaces.create as any).mockResolvedValue({
            success: true,
            message: 'Workspace created successfully',
            data: { id: 'new-ws', name: 'New Workspace' }
        });

        render(
            <ErrorProvider>
                <HomePage />
            </ErrorProvider>
        );

        // Open modal
        const createButton = screen.getByRole('button', { name: /New Workspace/i });
        fireEvent.click(createButton);

        // Step 0: Identity
        const nameInput = await screen.findByPlaceholderText(/Engineering Knowledge Base/i);
        fireEvent.change(nameInput, { target: { value: 'New Workspace' } });

        // Jump to last step via sidebar
        const stepButton = await screen.findByRole('button', { name: /AI Model/i });
        fireEvent.click(stepButton);

        // Submit - use findByText to wait for it to appear
        const submitButton = await screen.findByText(/Initialize Hub/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(workspaces.create).toHaveBeenCalledWith(expect.objectContaining({
                requestBody: expect.objectContaining({
                    name: 'New Workspace'
                })
            }));
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith('/workspaces/new-ws');
        }, { timeout: 3000 });
    });

    it('selects simple fields in create modal', async () => {

        (workspaces.create as any).mockResolvedValue({
            success: true,
            message: 'Workspace created successfully',
            data: { id: 'new-ws' }
        });

        render(
            <ErrorProvider>
                <HomePage />
            </ErrorProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: /New Workspace/i }));

        // Step 0: Identity
        const nameInput = await screen.findByPlaceholderText(/Engineering Knowledge Base/i);
        fireEvent.change(nameInput, { target: { value: 'Custom WS' } });

        // Jump to last step via sidebar
        const genStepText = await screen.findByText(/AI Model/i);
        const stepButton = genStepText.closest('.group')?.querySelector('button');
        fireEvent.click(stepButton!);

        const submitButton = await screen.findByText(/Initialize Hub/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(workspaces.create).toHaveBeenCalledWith(expect.objectContaining({
                requestBody: expect.objectContaining({
                    name: 'Custom WS'
                })
            }));
        }, { timeout: 3000 });
    });
});
