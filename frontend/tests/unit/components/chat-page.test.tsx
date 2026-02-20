import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock hooks
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
        getChatHistoryChatHistoryThreadIdGet: vi.fn().mockResolvedValue({ data: [] }),
        getThreadsChatThreadsGet: vi.fn().mockResolvedValue({ data: [] }),
    }
}));

// Import after mocks
import ChatPage from '@/app/chats/[id]/page';
import { ErrorProvider } from '@/context/error-context';
import { TaskProvider } from '@/context/task-context';

describe('ChatPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ErrorProvider>
                <TaskProvider>
                    {ui}
                </TaskProvider>
            </ErrorProvider>
        );
    };

    it('renders thread sidebar', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByText('History')).toBeInTheDocument();
        expect(await screen.findByTitle('New Chat')).toBeInTheDocument();
    });

    it('renders chat input', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('shows empty state when no messages', async () => {
        renderWithProviders(<ChatPage />);
        expect(await screen.findByText('Ask anything about your documents')).toBeInTheDocument();
    });
});
