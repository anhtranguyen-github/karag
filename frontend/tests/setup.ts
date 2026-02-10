import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({
        id: 'test-workspace',
    }),
    usePathname: () => '/workspaces/test-workspace',
}));

import { server } from '../src/mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock fetch (optional, as MSW intercepts it, but good for specific spies)
global.fetch = vi.fn();
