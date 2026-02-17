import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
import ChatPage from '@/app/workspaces/[id]/chat/page';

describe('ChatPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders thread sidebar', () => {
        render(<ChatPage />);
        expect(screen.getByText('Threads')).toBeInTheDocument();
        expect(screen.getByTitle('New Chat')).toBeInTheDocument();
    });

    it('renders chat input', () => {
        render(<ChatPage />);
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
        render(<ChatPage />);
        expect(screen.getByText('Ask anything about your documents...')).toBeInTheDocument();
    });
});
