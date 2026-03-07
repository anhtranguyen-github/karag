'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Save,
    Loader2, Brain,
    Check, Lock, SlidersHorizontal, Cpu, Sparkles, Database
} from 'lucide-react';
import { useSettings, AppSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/toast-context';

export function SettingsManager({ onClose, workspaceId, workspaceName }: { onClose?: () => void, workspaceId?: string, workspaceName?: string }) {
    const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings(workspaceId);
    const { metadata, isLoading: isMetadataLoading } = useSettingsMetadata(workspaceId);
    const { success: toastSuccess, error: toastError } = useToast();

    const { workspaces, updateWorkspace } = useWorkspaces();
    const workspaceMetadata = workspaces.find(w => w.id === workspaceId);

    const [wsMetadata, setWsMetadata] = useState({
        name: workspaceName || workspaceMetadata?.name || '',
        description: workspaceMetadata?.description || ''
    });

    const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'chat' | 'ingestion' | 'retrieval' | 'storage'>('general');

    // Sync wsMetadata when workspaceMetadata loads
    React.useEffect(() => {
        if (workspaceMetadata) {
            setWsMetadata({
                name: workspaceMetadata.name,
                description: workspaceMetadata.description || ''
            });
        }
    }, [workspaceMetadata]);

    const isLoading = isSettingsLoading || isMetadataLoading;

    if (isLoading || !settings || !metadata) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center gap-8",
                onClose ? "fixed inset-0 z-[100] bg-background/80 backdrop-blur-2xl" : "h-[500px] w-full"
            )}>
                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-[2.5rem] border border-indigo-500/20 animate-pulse" />
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground tracking-[0.4em] animate-pulse">loading settings</span>
                    <span className="text-[9px] text-muted-foreground/40 font-bold tracking-widest">identifying workspace...</span>
                </div>
            </div>
        );
    }

    const current = { ...settings, ...localSettings };

    const isMutable = (key: string) => {
        return metadata[key]?.mutable ?? true;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update Workspace Metadata if changed
            if (workspaceId && (wsMetadata.name !== workspaceMetadata?.name || wsMetadata.description !== workspaceMetadata?.description)) {
                await updateWorkspace(workspaceId, wsMetadata.name, wsMetadata.description);
            }

            // 2. Update Operational Settings
            if (Object.keys(localSettings).length > 0) {
                await updateSettings(localSettings);
            }

            setLocalSettings({});
            toastSuccess('Settings updated successfully');
            if (onClose) onClose();
        } catch (err: any) {
            console.error('Save failed', err);
            toastError(err.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSettingChange = (key: keyof AppSettings, value: string | number | boolean) => {
        if (!isMutable(key as string)) return;
        setLocalSettings(prev => {
            const next = { ...prev, [key]: value };
            if (settings && settings[key] === value) {
                delete next[key];
            }
            return next;
        });
    };

    const tabs = [
        { id: 'general', label: 'general', icon: SlidersHorizontal },
        { id: 'chat', label: 'chat', icon: Brain },
        { id: 'ingestion', label: 'ingestion', icon: Sparkles },
        { id: 'retrieval', label: 'retrieval', icon: Search },
        { id: 'storage', label: 'storage', icon: Database },
    ] as const;

    const renderSettingRow = (key: keyof AppSettings, label: string, description: string) => {
        const fieldMeta = metadata[key];
        const mutable = isMutable(key);
        const value = current[key];

        if (!fieldMeta) return null;

        const renderInput = () => {
            // Special Case: Execution Mode (Premium Cards)
            if (key === 'runtime_mode' && fieldMeta.options) {
                return (
                    <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
                        {fieldMeta.options.map((opt: string) => (
                            <button
                                key={opt}
                                disabled={!mutable}
                                onClick={() => handleSettingChange(key, opt)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl border text-[10px] font-bold transition-all capitalize relative overflow-hidden",
                                    value === opt
                                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-sm"
                                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:border-border/80",
                                    !mutable && "cursor-not-allowed opacity-40"
                                )}
                            >
                                {opt}
                                {value === opt && (
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                );
            }

            if (fieldMeta.field_type === 'select' && fieldMeta.options) {
                return (
                    <div className="relative w-full max-w-[320px]">
                        <select
                            value={value as string}
                            disabled={!mutable}
                            onChange={(e) => handleSettingChange(key, e.target.value)}
                            className={cn(
                                "w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all appearance-none cursor-pointer pr-10",
                                !mutable && "cursor-not-allowed opacity-60"
                            )}
                        >
                            {fieldMeta.options.map((opt: string) => (
                                <option key={opt} value={opt} className="bg-background text-foreground">
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-40">
                            <SlidersHorizontal size={14} />
                        </div>
                    </div>
                );
            }

            if (fieldMeta.field_type === 'bool' || typeof value === 'boolean') {
                return (
                    <button
                        disabled={!mutable}
                        onClick={() => handleSettingChange(key, !value)}
                        className={cn(
                            "w-12 h-6 rounded-full p-1 transition-all relative",
                            value ? "bg-indigo-500" : "bg-secondary border border-border",
                            !mutable && "cursor-not-allowed opacity-40"
                        )}
                    >
                        <div className={cn("w-4 h-4 rounded-full transition-all shadow-sm", value ? "bg-white translate-x-6" : "bg-muted-foreground translate-x-0")} />
                    </button>
                );
            }

            if (fieldMeta.field_type === 'int' || fieldMeta.field_type === 'float' || typeof value === 'number') {
                const min = fieldMeta.min ?? 0;
                const max = fieldMeta.max ?? (fieldMeta.field_type === 'float' ? 1 : 100);
                const step = fieldMeta.step ?? (fieldMeta.field_type === 'float' ? 0.05 : 1);

                return (
                    <div className="flex flex-col items-end gap-3 w-full max-w-[280px]">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-indigo-500 bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/10 shadow-sm">
                                {value}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value as number}
                            disabled={!mutable}
                            onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30"
                        />
                    </div>
                );
            }

            return (
                <div className="relative w-full max-w-[320px]">
                    <input
                        type="text"
                        value={value as string}
                        disabled={!mutable}
                        onChange={(e) => handleSettingChange(key, e.target.value)}
                        className={cn(
                            "w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all",
                            !mutable && "cursor-not-allowed opacity-60"
                        )}
                        placeholder="Enter value..."
                    />
                    {!mutable && (
                        <div className="absolute inset-0 bg-transparent flex items-center justify-end pr-4 pointer-events-none opacity-20">
                            <Lock size={12} />
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className={cn(
                "group relative py-6 border-b transition-all border-border last:border-0",
                !mutable && "opacity-60"
            )}>
                <div className="flex items-center justify-between gap-12">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-bold text-foreground">{label}</p>
                            {!mutable && (
                                <div className="px-2 py-0.5 rounded-md bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-1">
                                    <Lock size={12} className="text-indigo-500" />
                                    <span className="text-xs font-medium text-indigo-500 tracking-wide">protected</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl opacity-80 group-hover:opacity-100 transition-opacity">
                            {fieldMeta.description || description}
                        </p>
                    </div>

                    <div className="shrink-0">
                        <div className="w-full flex justify-end">
                            {renderInput()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
                "relative w-full flex bg-background",
                onClose ? "h-full rounded-3xl overflow-hidden border border-border" : "h-full"
            )}
        >
            {/* Modern Sidebar */}
            <aside className="w-[280px] border-r border-border p-8 flex flex-col gap-2 shrink-0 bg-secondary/10">
                <div className="px-2 mb-6">
                    <span className="text-[9px] font-bold text-muted-foreground/40 tracking-[0.3em]">menu</span>
                </div>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl transition-all relative group overflow-hidden",
                            activeTab === tab.id
                                ? "bg-foreground text-background shadow-xl shadow-foreground/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                            activeTab === tab.id
                                ? "bg-background/10 border-background/20 text-background"
                                : "bg-background border-border group-hover:bg-secondary"
                        )}>
                            <tab.icon size={18} />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-sm font-medium">{tab.label}</span>
                            {activeTab === tab.id && (
                                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">active</span>
                            )}
                        </div>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="sidebar-accent"
                                className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-full"
                            />
                        )}
                    </button>
                ))}


            </aside>

            {/* Right Side Stack: Header + Content (scrollable), Footer (fixed) */}
            <div className="flex-1 flex flex-col min-w-0 bg-background relative h-full">
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <main className="flex-1 p-8 lg:p-12 shrink-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-4xl mx-auto space-y-10"
                            >
                                {/* Section Header */}
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-2xl font-bold text-foreground">
                                        {tabs.find(t => t.id === activeTab)?.label} Settings
                                    </h3>
                                    <div className="h-0.5 w-12 bg-indigo-500" />
                                </div>

                                <div className="space-y-12">
                                    {activeTab === 'general' && (
                                        <div className="space-y-8">
                                            {workspaceId && (
                                                <div className="space-y-6">
                                                    <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">Workspace Identity</h4>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-foreground">Workspace Name</label>
                                                        <input
                                                            type="text"
                                                            value={wsMetadata.name}
                                                            onChange={(e) => setWsMetadata(prev => ({ ...prev, name: e.target.value }))}
                                                            placeholder="Enter workspace name..."
                                                            className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-foreground">Description</label>
                                                        <textarea
                                                            value={wsMetadata.description}
                                                            onChange={(e) => setWsMetadata(prev => ({ ...prev, description: e.target.value }))}
                                                            placeholder="What is this workspace for?"
                                                            rows={3}
                                                            className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">additional settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('show_reasoning', 'Show thinking', 'Display how the AI reached its answer.')}
                                                    {renderSettingRow('theme', 'Theme', 'Change the appearance of the interface.')}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'chat' && (
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">mutable settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('llm_provider', 'Chat provider', 'The AI service used for chat.')}
                                                    {renderSettingRow('llm_model', 'Model', 'The specific AI model used.')}
                                                    {renderSettingRow('runtime_mode', 'Response mode', 'Execution strategy (auto, fast, think, deep).')}
                                                    {renderSettingRow('runtime_stream_thoughts', 'Show thinking', 'Stream the agents internal reasoning LIVE to the chat.')}
                                                    {renderSettingRow('runtime_trace_level', 'Detailed tracing', 'Depth of observability and logging for RAG operations.')}
                                                    {renderSettingRow('temperature', 'Creativity', 'Controls how creative or literal the responses are.')}
                                                    {renderSettingRow('system_prompt', 'Instructions', 'Core guide defining the assistant behavior.')}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">additional settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('agentic_enabled', 'Use tools', 'Enables the AI to use tools and search for complex tasks.')}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'ingestion' && (
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="text-[11px] font-black text-indigo-500 tracking-[0.2em] mb-4">immutable settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('chunking_strategy', 'Chunking method', 'How documents are split into smaller pieces.')}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">mutable settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('job_concurrency', 'Process speed', 'Number of simultaneous tasks for document processing.')}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'retrieval' && (
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">mutable settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('rag_engine', 'Search method', 'The methodology used for finding information.')}
                                                    {renderSettingRow('search_limit', 'Context limit', 'Number of file fragments used per response.')}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-muted-foreground tracking-[0.2em] mb-4">additional settings</h4>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('hybrid_alpha', 'Search balance', 'Balance between semantic meaning and exact keyword matches.')}
                                                    {renderSettingRow('reranker_enabled', 'Enable reranking', 'An extra pass to improve result relevance.')}
                                                    {renderSettingRow('reranker_provider', 'Rerank provider', 'The service used to re-score retrieval results (Local is fastest).')}
                                                    {renderSettingRow('rerank_top_k', 'Rerank Top-N', 'Number of final documents to keep after reranking.')}
                                                    {renderSettingRow('graph_enabled', 'Use graph', 'Uses document relationships to find better context.')}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'storage' && (
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="text-[11px] font-black text-indigo-500 tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <Lock size={12} />
                                                    immutable settings
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground mb-6">These parameters define how data is stored and indexed in this workspace. They cannot be changed after creation.</p>
                                                <div className="grid gap-2">
                                                    {renderSettingRow('embedding_provider', 'Embedding provider', 'Provider used to process documents.')}
                                                    {renderSettingRow('embedding_model', 'Embedding model', 'Model used for document search.')}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
                {/* Premium Interaction Footer */}
                <footer className="px-12 py-6 border-t border-border flex items-center justify-between shrink-0 bg-background z-10 w-full mt-auto">
                    <div className="flex items-center gap-8">
                        {(Object.keys(localSettings).length > 0 || (workspaceId && (wsMetadata.name !== workspaceMetadata?.name || wsMetadata.description !== workspaceMetadata?.description))) && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-left-4">
                                <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500">
                                    changes detected
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="h-12 px-8 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all tracking-[0.2em] rounded-2xl hover:bg-secondary/80 border border-transparent hover:border-border"
                            >
                                cancel
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || (Object.keys(localSettings).length === 0 && wsMetadata.name === workspaceMetadata?.name && wsMetadata.description === workspaceMetadata?.description)}
                            className="h-12 px-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[11px] font-bold tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4 group"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save size={16} className="group-hover:rotate-12 transition-transform" />
                            )}
                            save changes
                        </button>
                    </div>
                </footer>
            </div>
        </motion.div>
    );
}
