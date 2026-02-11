import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface AppSettings {
    llm_provider: string;
    llm_model: string;
    embedding_provider: string;
    embedding_model: string;
    retrieval_mode: 'hybrid' | 'vector' | 'keyword';
    search_limit: number;
    hybrid_alpha: number;
    theme: string;
    show_reasoning: boolean;
}

export function useSettings(workspaceId?: string) {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchSettings = useCallback(async () => {
        try {
            const url = workspaceId
                ? `${API_ROUTES.SETTINGS}?workspace_id=${encodeURIComponent(workspaceId)}`
                : API_ROUTES.SETTINGS;
            const res = await fetch(url);
            if (!res.ok) {
                showError("Configuration Hub Offline", "Unable to retrieve synchronization parameters. Defaulting to local cache.");
                return;
            }
            const rawData = await res.json();

            // Runtime Validation
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const { AppSettingsSchema } = await import('@/lib/schemas/settings');

            const ResponseSchema = AppResponseSchema(AppSettingsSchema);
            const result = ResponseSchema.safeParse(rawData);

            if (!result.success) {
                console.error("API Contract Violation (Settings):", result.error);
                return;
            }

            const payload = result.data;
            if (payload.success && payload.data) {
                setSettings(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, showError]);

    const updateSettings = async (updates: Partial<AppSettings>) => {
        try {
            const url = workspaceId
                ? `${API_ROUTES.SETTINGS}?workspace_id=${encodeURIComponent(workspaceId)}`
                : API_ROUTES.SETTINGS;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();

            if (res.ok) {
                setSettings(data);
                return data;
            } else {
                let title = "Deployment Failed";
                let message = data.detail || "The cluster rejected the configuration update.";

                if (data.code === "VALIDATION_ERROR") {
                    title = "Invalid Parameter Scope";
                }

                showError(title, message, data.params ? JSON.stringify(data.params) : undefined);
                return null;
            }
        } catch (err) {
            console.error('Failed to update settings:', err);
            showError("Transmission Failure", "Handshake timed out while deploying neural parameters.");
            return null;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, updateSettings, isLoading, refreshSettings: fetchSettings };
}
