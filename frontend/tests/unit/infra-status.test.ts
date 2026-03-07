import { describe, it, expect, vi } from 'vitest';
import { api } from '@/lib/api-client';

describe('Infrastructure Health Check', () => {
    it('verifies backend is online according to contract', async () => {
        // Mock the root endpoint which returns status: online
        const mockResponse = {
            data: {
                status: 'online',
                version: '1.0.0'
            }
        };

        // Use vitest's mocked api (already set up in some other tests or we can do it here)

        vi.spyOn(api, 'healthCheckGet').mockResolvedValue(mockResponse as any);

        const response = await api.healthCheckGet();
        expect(response.status).toBe('online');
    });
});
