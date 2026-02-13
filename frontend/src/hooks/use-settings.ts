import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface AppSettings {
    llm_provider: string;
    llm_model: string;
    embedding_provider: string;
    embedding_model: string;
    search_limit: number;
    hybrid_alpha: number;
    theme: string;
    show_reasoning: boolean;
}

export interface SettingMetadata {
    mutable: boolean;
    category: string;
    description: string;
    options?: string[];
}

export function useSettingsMetadata() {
    const [metadata, setMetadata] = useState<Record<string, SettingMetadata> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetadata = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_ROUTES.SETTINGS_METADATA);
            if (res.ok) {
                const payload = await res.json();
                if (payload.success) {
                    setMetadata(payload.data);
                    setError(null);
                } else {
                    setError(payload.message || 'Failed to parse metadata.');
                }
            } else {
                setError('Metadata service unreachable.');
            }
        } catch (err) {
            console.error('Failed to fetch settings metadata:', err);
            setError('Connection failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    return { metadata, isLoading, error, refreshSettings: fetchMetadata };
}

export function useSettings(workspaceId?: string) {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
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

            // Runtime Validation - use loose schema as retrieval_mode is removed
            const { AppResponseSchema } = await import('@/lib/schemas/api');
            const payload = rawData;

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
                // The backend returns AppResponse.success_response(data=settings)
                const newSettings = data.data || data;
                setSettings(newSettings);
                return newSettings;
            } else {
                let title = "Deployment Failed";
                let message = data.message || data.detail || "The cluster rejected the configuration update.";

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
