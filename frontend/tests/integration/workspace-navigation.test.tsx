import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '@/lib/api-client';

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

vi.mock('@/lib/api-client', () => ({
    api: {
        listWorkspacesWorkspacesGet: vi.fn(),
        getSettingsMetadataSettingsMetadataGet: vi.fn(),
        createWorkspaceWorkspacesPost: vi.fn(),
    }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.listWorkspacesWorkspacesGet as any).mockResolvedValue({ data: mockWorkspaces });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.getSettingsMetadataSettingsMetadataGet as any).mockResolvedValue({ data: {} });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.createWorkspaceWorkspacesPost as any).mockResolvedValue({ data: { id: 'new-ws', name: 'New Workspace' } });

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
        const nav = await screen.findByRole('navigation');
        const genStepText = await within(nav).findByText(/AI Model/i);
        fireEvent.click(genStepText.closest('button')!);

        // Submit - use findByText to wait for it to appear
        const submitButton = await screen.findByText(/Launch Workspace/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.createWorkspaceWorkspacesPost).toHaveBeenCalledWith(expect.objectContaining({
                workspaceCreate: expect.objectContaining({
                    name: 'New Workspace'
                })
            }));
        }, { timeout: 3000 });

        expect(mockRefresh).toHaveBeenCalled();
    });

    it('selects simple fields in create modal', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.createWorkspaceWorkspacesPost as any).mockResolvedValue({ data: { id: 'new-ws' } });

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
        const nav = await screen.findByRole('navigation');
        const genStepText = await within(nav).findByText(/AI Model/i);
        fireEvent.click(genStepText.closest('button')!);

        const submitButton = await screen.findByText(/Launch Workspace/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.createWorkspaceWorkspacesPost).toHaveBeenCalledWith(expect.objectContaining({
                workspaceCreate: expect.objectContaining({
                    name: 'Custom WS'
                })
            }));
        }, { timeout: 3000 });
    });
});
