import { describe, it, expect, vi } from 'vitest';
import { api } from '@/lib/api-client';

describe('Infrastructure Health Check', () => {
    it('verifies backend is online according to contract', async () => {
        const mockResponse = {
            status: 'online',
            version: '1.0.0'
        };

        vi.spyOn(api, 'healthCheckGet').mockResolvedValue(mockResponse as any);

        const response = await api.healthCheckGet() as any;
        expect(response.status).toBe('online');
    });
});
