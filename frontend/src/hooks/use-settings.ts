import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface AppSettings {
    llm_provider: string;
    llm_model: string;
    temperature: number;
    max_tokens: number;
    embedding_provider: string;
    embedding_model: string;
    search_limit: number;
    hybrid_alpha: number;
    reranker_enabled: boolean;
    agentic_enabled: boolean;
    rag_engine: 'basic' | 'graph';
    graph_enabled: boolean;
    theme: string;
    show_reasoning: boolean;
    job_concurrency: number;
    system_prompt: string;
    chunking_strategy: string;
    runtime_mode: string;
    runtime_stream_thoughts: boolean;
    runtime_trace_level: string;
}

export interface SettingMetadata {
    mutable: boolean;
    category: string;
    description: string;
    options?: string[];
    field_type: 'string' | 'int' | 'float' | 'bool' | 'select';
    min?: number;
    max?: number;
    step?: number;
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
                showError("Connection error", "Unable to retrieve settings. Please check your connection.");
                return;
            }
            const rawData = await res.json();

            // Runtime Validation - use loose schema as retrieval_mode is removed
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
                let title = "Failed to save";
                const message = data.message || data.detail || "The server rejected the configuration update.";
                if (data.code === "VALIDATION_ERROR") {
                    title = "Invalid input";
                }

                showError(title, message, data.params ? JSON.stringify(data.params) : undefined);
                return null;
            }
        } catch (err) {
            console.error('Failed to update settings:', err);
            showError("Network error", "Action failed. Please try again.");
            return null;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, updateSettings, isLoading, refreshSettings: fetchSettings };
}
