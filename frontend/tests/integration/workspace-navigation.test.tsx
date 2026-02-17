import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Workspace Navigation Integration', () => {
    const mockWorkspaces = [
        { id: 'default', name: 'Default Workspace', description: 'Test desc 1' },
        { id: 'ws-1', name: 'Test Workspace', description: 'Test desc 2' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (api.listWorkspacesWorkspacesGet as any).mockResolvedValue({ data: mockWorkspaces });
        (api.getSettingsMetadataSettingsMetadataGet as any).mockResolvedValue({ data: {} });
    });

    it('navigates to workspace when card clicked', async () => {
        render(<HomePage />);

        const link = await screen.findByRole('link', { name: /Default Workspace/i });
        expect(link).toHaveAttribute('href', '/workspaces/default/chat');
    });

    it('opens create modal and creates workspace', async () => {
        (api.createWorkspaceWorkspacesPost as any).mockResolvedValue({ data: { id: 'new-ws', name: 'New Workspace' } });

        render(<HomePage />);

        // Open modal
        const createButton = screen.getByRole('button', { name: /New Workspace/i });
        fireEvent.click(createButton);

        // Fill form
        const nameInput = await screen.findByLabelText(/Workspace Name/i);
        fireEvent.change(nameInput, { target: { value: 'New Workspace' } });

        // Submit
        const submitButton = screen.getByRole('button', { name: /Launch Workspace/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.createWorkspaceWorkspacesPost).toHaveBeenCalledWith(expect.objectContaining({
                workspaceCreate: expect.objectContaining({
                    name: 'New Workspace'
                })
            }));
        });

        expect(mockRefresh).toHaveBeenCalled();
    });

    it('selects simple fields in create modal', async () => {
        (api.createWorkspaceWorkspacesPost as any).mockResolvedValue({ data: { id: 'new-ws' } });
        (api.getSettingsMetadataSettingsMetadataGet as any).mockResolvedValue({
            data: {
                llm_provider: {
                    mutable: false,
                    category: 'ai',
                    description: 'LLM Provider',
                    options: ['openai', 'anthropic']
                }
            }
        });

        render(<HomePage />);

        fireEvent.click(screen.getByRole('button', { name: /New Workspace/i }));

        const nameInput = await screen.findByLabelText(/Workspace Name/i);
        fireEvent.change(nameInput, { target: { value: 'Custom WS' } });

        const llmSelect = await screen.findByLabelText(/Llm Provider/i);
        fireEvent.change(llmSelect, { target: { value: 'openai' } });

        const submitButton = screen.getByRole('button', { name: /Launch Workspace/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.createWorkspaceWorkspacesPost).toHaveBeenCalledWith(expect.objectContaining({
                workspaceCreate: expect.objectContaining({
                    name: 'Custom WS',
                    llmProvider: 'openai'
                })
            }));
        });
    });
});
