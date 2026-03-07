import { useState, useEffect, useCallback } from 'react';
import { admin } from '@/sdk/admin';
import { workspaces } from '@/sdk/workspaces';
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
    rerank_top_k: number;
    reranker_provider: string;
    agentic_enabled: boolean;
    agent_max_iterations: number;
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

const isAuthError = (payload: any) => {
    const status = payload?.response?.status;
    const code = payload?.error?.code ?? payload?.detail?.code;
    return status === 401 || status === 403 || code === 'AUTHENTICATION_REQUIRED' || code === 'AUTHENTICATION_ERROR';
};

const unwrapPayload = <T,>(payload: any): T => {
    if (payload?.error) {
        throw payload;
    }

    return (payload?.data?.data ?? payload?.data ?? payload) as T;
};

export function useSettingsMetadata(workspaceId?: string) {
    const [metadata, setMetadata] = useState<Record<string, SettingMetadata> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetadata = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = workspaceId
                ? (await workspaces.getSettingsMetadata({ workspaceId }))
                : (await admin.getGlobalSettingsMetadata());

            setMetadata(unwrapPayload<Record<string, SettingMetadata>>(payload));
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch settings metadata:', err);
            setMetadata(null);
            setError(isAuthError(err) ? null : 'Connection failed.');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

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
            const payload = workspaceId
                ? (await workspaces.getSettings({ workspaceId }))
                : (await admin.getGlobalSettings());

            setSettings(unwrapPayload<AppSettings>(payload));
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setSettings(null);
            if (!isAuthError(err)) {
                showError("Connection error", "Unable to retrieve settings. Please check your connection.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, showError]);

    const updateSettings = async (updates: Partial<AppSettings>) => {
        try {
            const payload = workspaceId
                ? (await workspaces.updateSettings({
                    workspaceId,
                    requestBody: updates as any
                }))
                : (await admin.updateGlobalSettings({
                    requestBody: updates as any
                }));

            const newSettings = unwrapPayload<AppSettings>(payload);
            setSettings(newSettings);
            return newSettings;
        } catch (err: any) {
            console.error('Failed to update settings:', err);
            if (isAuthError(err)) {
                showError("Authentication required", "Please sign in again to update settings.");
            } else {
                showError("Network error", "Action failed. Please try again.");
            }
            return null;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, updateSettings, isLoading, refreshSettings: fetchSettings };
}
