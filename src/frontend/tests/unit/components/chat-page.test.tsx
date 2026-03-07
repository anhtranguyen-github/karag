import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock hooks
vi.mock('@/hooks/use-workspaces', () => ({
    useWorkspaces: () => ({
        workspaces: [],
        currentWorkspace: null,
        isLoading: false,
    }),
}));

vi.mock('@/hooks/use-chat', () => ({
    useChat: () => ({
        messages: [],
        isLoading: false,
        sendMessage: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-threads', () => ({
    useThreads: () => ({
        threads: [],
        isLoading: false,
        createThread: vi.fn(),
        deleteThread: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'test-workspace' }),
    usePathname: () => '/workspaces/test-workspace/chat',
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api-client', () => ({
    api: {
        getThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGet: vi.fn().mockResolvedValue({ success: true, data: { workspace_id: 'test-workspace' } }),
        getChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGet: vi.fn().mockResolvedValue({ success: true, data: [] }),
        listChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGet: vi.fn().mockResolvedValue({ success: true, data: [] }),
    }
}));

import ChatPage from '@/app/chats/[id]/page';
import { ToastProvider } from '@/context/toast-context';
import { ErrorProvider } from '@/context/error-context';
import { TaskProvider } from '@/context/task-context';

describe('ChatPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ToastProvider>
                <ErrorProvider>
                    <TaskProvider>
                        {ui}
                    </TaskProvider>
                </ErrorProvider>
            </ToastProvider>
        );
    };

    it('renders thread sidebar', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByText(/history/i)).toBeInTheDocument();
        expect(await screen.findByTitle('New Chat')).toBeInTheDocument();
    });

    it('renders chat input', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('shows empty state when no messages', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByText(/Ask anything about your documents/i)).toBeInTheDocument();
    });
});
