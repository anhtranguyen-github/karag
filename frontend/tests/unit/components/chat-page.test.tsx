import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock hooks
vi.mock('@/hooks/use-chat', () => ({
    useChat: () => ({
        messages: [],
        isLoading: false,
        sendMessage: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-settings', () => ({
    useSettings: () => ({
        settings: { show_reasoning: false },
        updateSettings: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'test-workspace' }),
    usePathname: () => '/workspaces/test-workspace/chat',
}));

// Import after mocks
import ChatPage from '@/app/workspaces/[id]/chat/page';

describe('ChatPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders mode selector with three options', () => {
        render(<ChatPage />);

        expect(screen.getByRole('button', { name: /Fast/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Thinking/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reasoning/i })).toBeInTheDocument();
    });

    it('renders chat input', () => {
        render(<ChatPage />);

        // The placeholder is dynamic based on mode, default is 'fast'
        expect(screen.getByPlaceholderText('Message in fast mode...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
        render(<ChatPage />);

        expect(screen.getByText('Start a Conversation')).toBeInTheDocument();
        expect(screen.getByText(/Ask questions about your documents/)).toBeInTheDocument();
    });

    it('shows quick start options', () => {
        render(<ChatPage />);

        expect(screen.getByText('Summarize my documents')).toBeInTheDocument();
        expect(screen.getByText('Find related concepts')).toBeInTheDocument();
        expect(screen.getByText('Explain this topic')).toBeInTheDocument();
        expect(screen.getByText('Compare sources')).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
        render(<ChatPage />);

        const sendButton = screen.getByRole('button', { name: 'Send message' });
        expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', () => {
        render(<ChatPage />);

        const input = screen.getByPlaceholderText('Message in fast mode...');
        fireEvent.change(input, { target: { value: 'Hello' } });

        const sendButton = screen.getByRole('button', { name: 'Send message' });
        expect(sendButton).not.toBeDisabled();
    });

    it('changes mode when mode button clicked', async () => {
        render(<ChatPage />);

        const thinkingButton = screen.getByRole('button', { name: /Thinking/i });
        fireEvent.click(thinkingButton);

        // Check that Thinking button is now active (has bg-blue-600 class)
        expect(thinkingButton).toHaveClass('bg-blue-600/20');
    });
});

describe('ChatPage with messages', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Override mock to have messages
        vi.doMock('@/hooks/use-chat', () => ({
            useChat: () => ({
                messages: [
                    { id: '1', role: 'user', content: 'Hello' },
                    { id: '2', role: 'assistant', content: 'Hi there!' },
                ],
                isLoading: false,
                sendMessage: vi.fn(),
            }),
        }));
    });

    it('shows workspace ID in header', () => {
        render(<ChatPage />);

        expect(screen.getByText(/Workspace:/)).toBeInTheDocument();
    });
});
