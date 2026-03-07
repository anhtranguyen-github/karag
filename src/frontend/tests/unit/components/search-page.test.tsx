import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
}));

// Import after mocks
import SearchPage from '@/app/search/page';

describe('SearchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        localStorage.clear();
    });

    it('renders search input', () => {
        render(<SearchPage />);

        expect(screen.getByPlaceholderText(/Search documents, chats, workspaces/)).toBeInTheDocument();
    });

    it('shows back link', () => {
        render(<SearchPage />);

        expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    it('clears search when X clicked', async () => {
        render(<SearchPage />);

        const input = screen.getByPlaceholderText(/Search documents/);
        fireEvent.change(input, { target: { value: 'test' } });

        expect(input).toHaveValue('test');

        const clearButton = screen.getByRole('button', { name: '' }); // X button
        fireEvent.click(clearButton);

        expect(input).toHaveValue('');
    });

    it('shows no results message when search yields nothing', async () => {
        vi.useFakeTimers();
        const { act } = await import('@testing-library/react');

        // Mock fetch to return success but empty results
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: { documents: [], workspaces: [], threads: [] }
            }),
        });

        render(<SearchPage />);

        const input = screen.getByPlaceholderText(/Search documents/);

        await act(async () => {
            fireEvent.change(input, { target: { value: 'nonexistent' } });
        });

        // Fast-forward debounce timer
        await act(async () => {
            vi.advanceTimersByTime(400);
        });

        // Should show no results - resolved fetch should have updated state
        expect(screen.getByText(/No results found/)).toBeInTheDocument();
        vi.useRealTimers();
    });
});

describe('SearchPage with recent searches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('recentSearches', JSON.stringify(['previous search', 'another query']));
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
    });

    it('shows recent searches when no query', () => {
        render(<SearchPage />);

        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
        expect(screen.getByText('previous search')).toBeInTheDocument();
        expect(screen.getByText('another query')).toBeInTheDocument();
    });

    it('populates input when recent search clicked', () => {
        render(<SearchPage />);

        const recentSearchButton = screen.getByText('previous search');
        fireEvent.click(recentSearchButton);

        const input = screen.getByPlaceholderText(/Search documents/);
        expect(input).toHaveValue('previous search');
    });
});
