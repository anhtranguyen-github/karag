'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Save,
    Loader2, Brain,
    Check, Lock, SlidersHorizontal, Cpu, Sparkles
} from 'lucide-react';
import { useSettings, AppSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

export function SettingsManager({ onClose, workspaceId, workspaceName }: { onClose?: () => void, workspaceId?: string, workspaceName?: string }) {
    const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings(workspaceId);
    const { metadata, isLoading: isMetadataLoading } = useSettingsMetadata();

    const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'generation' | 'retrieval' | 'infrastructure' | 'interface'>('generation');

    const isLoading = isSettingsLoading || isMetadataLoading;

    if (isLoading || !settings || !metadata) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center gap-6",
                onClose ? "fixed inset-0 z-[100] bg-[#0a0a0b] backdrop-blur-3xl" : "h-[400px] w-full"
            )}>
                <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
                <span className="text-muted-foreground text-tiny font-black uppercase tracking-[0.3em] animate-pulse">Loading settings...</span>
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
            await updateSettings(localSettings);
            setLocalSettings({});
            if (onClose) onClose();
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSettingChange = (key: keyof AppSettings, value: string | number | boolean) => {
        if (!isMutable(key as string)) return;
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const tabs = [
        { id: 'generation', label: 'Model', icon: Brain, color: 'text-blue-400' },
        { id: 'retrieval', label: 'Search', icon: Search, color: 'text-indigo-400' },
        { id: 'infrastructure', label: 'Infrastructure', icon: Cpu, color: 'text-amber-400' },
        { id: 'interface', label: 'Interface', icon: SlidersHorizontal, color: 'text-purple-400' },
    ] as const;

    const renderSettingRow = (key: keyof AppSettings, label: string, description: string) => {
        const mutable = isMutable(key);
        const value = current[key];

        return (
            <div className={cn(
                "group relative py-5 border-b transition-all border-border last:border-0",
                !mutable && "opacity-50"
            )}>
                <div className="flex items-center justify-between gap-8">
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{label}</p>
                            {!mutable && <Lock size={10} className="text-muted-foreground/40" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium max-w-xl truncate group-hover:whitespace-normal group-hover:text-clip transition-all">{description}</p>
                    </div>

                    <div className="shrink-0 w-[320px] flex justify-end">
                        <div className="w-full flex justify-end">
                            {typeof value === 'boolean' ? (
                                <button
                                    disabled={!mutable}
                                    onClick={() => handleSettingChange(key, !value)}
                                    className={cn(
                                        "w-10 h-5 rounded-full p-1 transition-all relative",
                                        value ? "bg-indigo-500 shadow-md shadow-indigo-500/20" : "bg-secondary",
                                        !mutable && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full bg-white transition-all shadow-sm", value ? "ml-5" : "ml-0")} />
                                </button>
                            ) : typeof value === 'number' ? (
                                <div className="flex flex-col items-end gap-2 w-full max-w-[200px]">
                                    <span className="text-[10px] font-black text-foreground">{value}</span>
                                    <input
                                        type="range"
                                        min={metadata[key]?.category === 'Retrieval Component' && key === 'hybrid_alpha' ? 0 : 1}
                                        max={key === 'hybrid_alpha' ? 1 : 100}
                                        step={key === 'hybrid_alpha' ? 0.1 : 1}
                                        value={value}
                                        disabled={!mutable}
                                        onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
                                        className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={value as string}
                                    disabled={!mutable}
                                    onChange={(e) => handleSettingChange(key, e.target.value)}
                                    className={cn(
                                        "w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all",
                                        !mutable && "cursor-not-allowed text-muted-foreground/60"
                                    )}
                                />
                            )}
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
            className="relative w-full h-full flex flex-col bg-transparent"
        >
            {/* Header */}
            <header className="px-10 py-8 flex items-center justify-between border-b border-border bg-black/5">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-600/20 text-indigo-50">
                        <Settings size={22} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            {workspaceName || 'Settings'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Active Node</span>
                            <code className="text-[10px] font-mono text-muted-foreground/60">{workspaceId || 'system_master'}</code>
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-border active:scale-95 shadow-sm"
                    >
                        <X size={18} />
                    </button>
                )}
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Nav Sidebar */}
                <aside className="w-[280px] border-r border-border p-6 flex flex-col gap-1 shrink-0 bg-black/10">
                    <div className="px-4 py-2 mb-4">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Configuration</span>
                    </div>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-col gap-1 p-3 rounded-xl transition-all relative group text-left",
                                activeTab === tab.id
                                    ? "bg-foreground text-background shadow-lg"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center border transition-all",
                                    activeTab === tab.id
                                        ? "bg-background/10 border-background/20 text-background"
                                        : "bg-secondary border-border group-hover:bg-muted group-hover:border-border/60"
                                )}>
                                    <tab.icon size={12} />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                            </div>
                            {activeTab === tab.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                            )}
                        </button>
                    ))}
                </aside>


                {/* Main Settings Panel */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 bg-black/5">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Section Intro */}
                            <div className="flex flex-col gap-1 mb-8">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1">
                                    <Sparkles size={10} />
                                    {activeTab === 'infrastructure' ? 'Static Engine' : 'Runtime Module'}
                                </div>
                                <h3 className="text-3xl font-bold text-foreground tracking-tight capitalize">
                                    {activeTab === 'generation' ? 'Model' :
                                        activeTab === 'retrieval' ? 'Search' :
                                            activeTab === 'infrastructure' ? 'Infrastructure' : 'Interface'} Settings
                                </h3>
                                <p className="text-[11px] text-muted-foreground/60 max-w-xl font-medium leading-relaxed">
                                    Configure core parameters for the {activeTab} stage. These settings directly impact performance and response quality.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                {activeTab === 'generation' && (
                                    <>
                                        {renderSettingRow('llm_provider', 'LLM Provider', 'Select the AI provider for chat generation')}
                                        {renderSettingRow('llm_model', 'LLM Model', 'The specific model used for processing queries')}
                                        {renderSettingRow('temperature', 'Temperature', 'Controls randomness: higher is more creative')}
                                        {renderSettingRow('max_tokens', 'Max Tokens', 'Maximum length of the generated response')}
                                    </>
                                )}
                                {activeTab === 'retrieval' && (
                                    <>
                                        {renderSettingRow('search_limit', 'Search Limit', 'Number of documents retrieved per search')}
                                        {renderSettingRow('hybrid_alpha', 'Hybrid Search Alpha', 'Balance between semantic (1) and keyword (0) search')}
                                        {renderSettingRow('reranker_enabled', 'Enable Reranking', 'Use a second model to re-score documents for better precision')}
                                        {renderSettingRow('agentic_enabled', 'Agentic Search', 'Allow the AI to perform multi-step research')}
                                    </>
                                )}
                                {activeTab === 'infrastructure' && (
                                    <>
                                        <div className="p-6 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 flex items-start gap-4 mb-4">
                                            <Sparkles size={16} className="text-indigo-400 mt-0.5" />
                                            <p className="text-[10px] text-indigo-400 font-medium leading-relaxed">
                                                Infrastructure settings are locked to ensure the search index remains valid. To change these, you must create a new workspace.
                                            </p>
                                        </div>
                                        {renderSettingRow('embedding_provider', 'Embedding Provider', 'Provider used to vectorise documents')}
                                        {renderSettingRow('embedding_model', 'Embedding Model', 'The specific model defining the vector space')}
                                        {renderSettingRow('rag_engine', 'Search Engine', 'The underlying search methodology')}
                                        {renderSettingRow('graph_enabled', 'Knowledge Graph', 'Use Graph relationships to improve context retrieval')}
                                    </>
                                )}
                                {activeTab === 'interface' && (
                                    <>
                                        {renderSettingRow('show_reasoning', 'Process Stream', 'Expose internal cognitive steps in UI')}
                                        {renderSettingRow('job_concurrency', 'Ingestion Throughput', 'Concurrent processing limit for new documents')}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Interaction Bar */}
            <footer className="px-10 py-6 border-t border-border flex items-center justify-between shrink-0 bg-black/10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Protocol Verified</span>
                    </div>
                    {Object.keys(localSettings).length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                {Object.keys(localSettings).length} Pendings
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="h-10 px-6 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest rounded-xl hover:bg-secondary"
                        >
                            Exit
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(localSettings).length === 0}
                        className="h-10 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        APPLY SYNC
                    </button>
                </div>
            </footer>
        </motion.div>
    );
}
