import { useState, useCallback, useEffect } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    type: 'system' | 'custom' | 'mcp';
    enabled: boolean;
    config?: Record<string, unknown>;
}

export function useTools() {
    const [tools, setTools] = useState<ToolDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();

    const fetchTools = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_ROUTES.TOOLS);
            if (!res.ok) {
                showError("Subsystem Timeout", "Unable to list active intelligence extensions.");
                return;
            }

            const rawData = await res.json();

            // Runtime Validation
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const { ToolDefinitionSchema } = await import('@/lib/schemas/tools');
            const { z } = await import('zod');

            const ResponseSchema = AppResponseSchema(z.array(ToolDefinitionSchema));
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation (Tools):", result.error);
                return;
            }

            const payload = result.data;
            if (payload.success && payload.data) {
                setTools(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch tools:', err);
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    const toggleTool = useCallback(async (id: string, enabled: boolean) => {
        try {
            const res = await fetch(`${API_ROUTES.TOOL_TOGGLE(id)}?enabled=${enabled}`, {
                method: 'POST',
            });
            if (res.ok) {
                setTools(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
            } else {
                const data = await res.json();
                showError("Interface Error", data.message || data.detail || "Unable to modify extension state.");
            }
        } catch (err) {
            console.error('Failed to toggle tool', err);
            showError("Network Error", "Lost tactical link during extension state modification.");
        }
    }, [showError]);

    const addTool = useCallback(async (tool: ToolDefinition) => {
        try {
            const res = await fetch(API_ROUTES.TOOLS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tool),
            });
            const data = await res.json();

            if (res.ok) {
                await fetchTools();
                return true;
            } else {
                let title = "Registration Failed";
                if (data.code === "CONFLICT_ERROR") {
                    title = "Identifier Conflict";
                }
                showError(title, data.message || data.detail || "The system rejected the extension registration.");
                return false;
            }
        } catch (err) {
            console.error('Failed to add tool', err);
            showError("Network Error", "Handshake failed during extension deployment.");
            return false;
        }
    }, [fetchTools, showError]);

    const deleteTool = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${API_ROUTES.TOOLS}${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setTools(prev => prev.filter(t => t.id !== id));
            } else {
                const data = await res.json();
                showError("Decommissioning Refused", data.message || data.detail || "The system refused to purge the intelligence extension.");
            }
        } catch (err) {
            console.error('Failed to delete tool', err);
            showError("Network Error", "Transmission lost during decommissioning sequence.");
        }
    }, [showError]);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    return {
        tools,
        isLoading,
        fetchTools,
        toggleTool,
        addTool,
        deleteTool
    };
}
