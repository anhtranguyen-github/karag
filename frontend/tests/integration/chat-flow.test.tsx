import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { api } from '@/lib/api-client';
import { useSearchParams } from 'next/navigation';

// Setup mocks
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({
        id: 'test-workspace',
    }),
    usePathname: () => '/workspaces/test-workspace/chat',
    useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/api-client', () => ({
    api: {
        getChatHistoryChatHistoryThreadIdGet: vi.fn().mockResolvedValue({ data: [] }),
        listChatThreadsChatThreadsGet: vi.fn().mockResolvedValue({ data: [] }),
    }
}));

// Mock fetch for SSE
const mockFetchEventSource = vi.fn();
vi.mock('@microsoft/fetch-event-source', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchEventSource: (...args: any[]) => mockFetchEventSource(...args),
}));

import ChatPage from '@/app/chats/[id]/page';
import { ErrorProvider } from '@/context/error-context';
import { TaskProvider } from '@/context/task-context';

describe('Chat Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useSearchParams as any).mockReturnValue(new URLSearchParams());
    });

    it('submits message through chat interface', async () => {
        render(
            <ErrorProvider>
                <TaskProvider>
                    <ChatPage />
                </TaskProvider>
            </ErrorProvider>
        );

        const input = await screen.findByPlaceholderText('Type your message...');

        fireEvent.change(input, { target: { value: 'Hello Assistant' } });
        fireEvent.submit(input.closest('form')!);

        // Assistant message should appear (thinking)
        expect(await screen.findByText('Searching and processing...')).toBeInTheDocument();

        // fetchEventSource should be called
        expect(mockFetchEventSource).toHaveBeenCalled();

        const { act } = await import('@testing-library/react');

        // Simulate SSE messages
        const onmessage = mockFetchEventSource.mock.calls[0][1].onmessage;
        await act(async () => {
            onmessage({ data: JSON.stringify({ type: 'thought', step: 'Searching documents...' }) });
            onmessage({ data: JSON.stringify({ type: 'content', delta: 'Hello!' }) });
            onmessage({ data: JSON.stringify({ type: 'content', delta: ' How can I help?' }) });
        });

        // Final content should appear
        expect(await screen.findByText(/Hello! How can I help?/)).toBeInTheDocument();
    });

    it('displays message history', async () => {
        const mockHistory = [
            { id: '1', role: 'user', content: 'What is RAG?' },
            { id: '2', role: 'assistant', content: 'Retrieval Augmented Generation' }
        ];

        // Re-mock to return history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.getChatHistoryChatHistoryThreadIdGet as any).mockResolvedValue({
            data: mockHistory
        });

        // We need a threadId in searchParams to trigger history fetch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useSearchParams as any).mockReturnValue(
            new URLSearchParams('threadId=t1')
        );

        render(
            <ErrorProvider>
                <TaskProvider>
                    <ChatPage />
                </TaskProvider>
            </ErrorProvider>
        );

        expect(await screen.findByText('What is RAG?')).toBeInTheDocument();
        expect(screen.getByText('Retrieval Augmented Generation')).toBeInTheDocument();
    });
});
