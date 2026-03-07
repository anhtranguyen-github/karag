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

export function useSettingsMetadata(workspaceId?: string) {
    const [metadata, setMetadata] = useState<Record<string, SettingMetadata> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetadata = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = (workspaceId
                ? (await workspaces.getSettingsMetadata({ workspaceId }))
                : (await admin.getGlobalSettingsMetadata())) as any;

            if (payload.success) {
                setMetadata(payload.data);
                setError(null);
            } else {
                setError(payload.message || 'Failed to parse metadata.');
            }
        } catch (err: any) {
            console.error('Failed to fetch settings metadata:', err);
            setError('Connection failed.');
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
            const payload = (workspaceId
                ? (await workspaces.getSettings({ workspaceId }))
                : (await admin.getGlobalSettings())) as any;

            if (payload.success && payload.data) {
                setSettings(payload.data);
            } else if (!payload.success) {
                showError("Connection error", "Unable to retrieve settings. Please check your connection.");
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            showError("Connection error", "Unable to retrieve settings. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, showError]);

    const updateSettings = async (updates: Partial<AppSettings>) => {
        try {
            const payload = (workspaceId
                ? (await workspaces.updateSettings({
                    workspaceId,
                    requestBody: updates as any
                }))
                : (await admin.updateGlobalSettings({
                    requestBody: updates as any
                }))) as any;

            if (payload.success) {
                const newSettings = payload.data || payload;
                setSettings(newSettings);
                return newSettings;
            } else {
                let title = "Failed to save";
                const message = payload.message || payload.detail || "The server rejected the configuration update.";
                if (payload.code === "VALIDATION_ERROR") {
                    title = "Invalid input";
                }

                showError(title, message, payload.params ? JSON.stringify(payload.params) : undefined);
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
