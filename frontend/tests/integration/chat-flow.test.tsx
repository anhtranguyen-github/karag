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
        getThreadsChatThreadsGet: vi.fn().mockResolvedValue({ data: [] }),
    }
}));

// Mock fetch for SSE
const mockFetchEventSource = vi.fn();
vi.mock('@microsoft/fetch-event-source', () => ({
    fetchEventSource: (...args: any[]) => mockFetchEventSource(...args),
}));

import ChatPage from '@/app/workspaces/[id]/chat/page';

describe('Chat Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useSearchParams as any).mockReturnValue(new URLSearchParams());
    });

    it('submits message through chat interface', async () => {
        render(<ChatPage />);

        const input = await screen.findByPlaceholderText('Type your message...');

        fireEvent.change(input, { target: { value: 'Hello Assistant' } });
        fireEvent.submit(input.closest('form')!);

        // Assistant message should appear (thinking)
        expect(screen.getByText('Thinking...')).toBeInTheDocument();

        // fetchEventSource should be called
        expect(mockFetchEventSource).toHaveBeenCalledWith(
            expect.stringContaining('/chat/stream'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Hello Assistant')
            })
        );
    });

    it('displays message history', async () => {
        const mockHistory = [
            { id: '1', role: 'user', content: 'What is RAG?' },
            { id: '2', role: 'assistant', content: 'Retrieval Augmented Generation' }
        ];

        // Re-mock to return history
        (api.getChatHistoryChatHistoryThreadIdGet as any).mockResolvedValue({
            data: mockHistory
        });

        // We need a threadId in searchParams to trigger history fetch
        (useSearchParams as any).mockReturnValue(
            new URLSearchParams('threadId=t1')
        );

        render(<ChatPage />);

        expect(await screen.findByText('What is RAG?')).toBeInTheDocument();
        expect(screen.getByText('Retrieval Augmented Generation')).toBeInTheDocument();
    });
});
