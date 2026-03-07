import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

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
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/context/auth-context', () => ({
    useAuth: () => ({
        user: { id: 'test-user', full_name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: any }) => children,
}));

vi.mock('@/context/toast-context', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    }),
    ToastProvider: ({ children }: { children: any }) => children,
}));

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
if (typeof window !== 'undefined') {
    window.ResizeObserver = ResizeObserverMock;
}
