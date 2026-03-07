import { describe, it, expect } from 'vitest';
import { AppResponseFromJSON } from '@/lib/api/models/AppResponse';
import { AppResponseListWorkspaceFromJSON } from '@/lib/api/models/AppResponseListWorkspace';

describe('API Models parsing', () => {
    it('successfully parses AppResponse with generic object data', () => {
        const json = {
            success: true,
            code: 'SUCCESS',
            message: 'Done',
            data: { key: 'value' }
        };
        const model = AppResponseFromJSON(json);
        expect(model.success).toBe(true);
        expect(model.data).toEqual({ key: 'value' });
    });

    it('successfully parses AppResponse with null data', () => {
        const json = {
            success: true,
            code: 'SUCCESS',
            message: 'Done',
            data: null
        };
        const model = AppResponseFromJSON(json);
        expect(model.success).toBe(true);
        expect(model.data).toBeFalsy();
    });

    it('successfully parses AppResponseListWorkspace with array data', () => {
        const json = {
            success: true,
            code: 'SUCCESS',
            message: 'Done',
            data: [
                { id: 'ws1', name: 'Workspace 1' },
                { id: 'ws2', name: 'Workspace 2' }
            ]
        };
        const model = AppResponseListWorkspaceFromJSON(json);
        expect(model.success).toBe(true);
        expect(model.data).toHaveLength(2);
        expect(model.data?.[0].name).toBe('Workspace 1');
    });
});
