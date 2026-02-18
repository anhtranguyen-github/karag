'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Save,
    Loader2, Brain, Shield,
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
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <span className="text-gray-500 text-tiny font-black uppercase tracking-[0.3em] animate-pulse">Loading settings...</span>
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
                "group relative py-7 border-b transition-all border-white/5 last:border-0",
                !mutable && "opacity-50"
            )}>
                <div className="flex items-center justify-between gap-12">
                    <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[12px] font-bold text-white uppercase tracking-wider">{label}</p>
                            {!mutable && <Lock size={12} className="text-gray-600" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium max-w-2xl">{description}</p>
                    </div>

                    <div className="shrink-0 w-[400px] flex justify-end">
                        {/* Control content */}
                        <div className="w-full flex justify-end">
                            {typeof value === 'boolean' ? (
                                <button
                                    disabled={!mutable}
                                    onClick={() => handleSettingChange(key, !value)}
                                    className={cn(
                                        "w-12 h-6 rounded-full p-1 transition-all relative",
                                        value ? "bg-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/10",
                                        !mutable && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <div className={cn("w-4 h-4 rounded-full bg-white transition-all", value ? "ml-6" : "ml-0")} />
                                </button>
                            ) : typeof value === 'number' ? (
                                <div className="flex flex-col items-end gap-3 w-full max-w-[240px]">
                                    <span className="text-xs font-black text-white">{value}</span>
                                    <input
                                        type="range"
                                        min={metadata[key]?.category === 'Retrieval Node' && key === 'hybrid_alpha' ? 0 : 1}
                                        max={key === 'hybrid_alpha' ? 1 : 100}
                                        step={key === 'hybrid_alpha' ? 0.1 : 1}
                                        value={value}
                                        disabled={!mutable}
                                        onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={value as string}
                                    disabled={!mutable}
                                    onChange={(e) => handleSettingChange(key, e.target.value)}
                                    className={cn(
                                        "w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-5 py-3 text-xs font-bold text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all",
                                        !mutable && "cursor-not-allowed text-gray-600"
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
            <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-600/20 text-white">
                        <Settings size={28} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            {workspaceName || 'Settings'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <code className="text-[8px] font-mono text-gray-500 uppercase">{workspaceId || 'system_master'}</code>
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all border border-white/5 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                )}
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Nav Sidebar */}
                <aside className="w-64 border-r border-white/5 p-6 flex flex-col gap-2 shrink-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative group",
                                activeTab === tab.id
                                    ? "bg-white text-black shadow-2xl"
                                    : "text-gray-600 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon size={18} className={cn("transition-transform group-hover:scale-110", activeTab === tab.id ? "text-black" : tab.color)} />
                            <span className="text-tiny font-black uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div layoutId="nav-glow" className="absolute -left-1 w-1.5 h-6 bg-blue-500 rounded-full blur-sm" />
                            )}
                        </button>
                    ))}
                </aside>


                {/* Main Settings Panel */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Section Intro */}
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-6 bg-blue-600 rounded-full" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
                                    {activeTab === 'generation' ? 'Model' :
                                        activeTab === 'retrieval' ? 'Search' :
                                            activeTab === 'infrastructure' ? 'Infrastructure' : 'Interface'} Settings
                                </h3>
                            </div>

                            <div className="grid gap-4">
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
                                        <div className="p-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-4 mb-4">
                                            <Sparkles size={16} className="text-blue-400 mt-0.5" />
                                            <p className="text-[10px] text-blue-400/70 font-medium leading-relaxed">
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
            <footer className="px-8 py-6 border-t border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Verified</span>
                    </div>
                    {Object.keys(localSettings).length > 0 && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {Object.keys(localSettings).length} Unsaved Changes
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-6 py-4 text-tiny font-black text-gray-600 hover:text-white transition-colors uppercase tracking-widest"
                        >
                            Abort
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(localSettings).length === 0}
                        className="group flex items-center gap-4 px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white text-tiny font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        SAVE CHANGES
                    </button>
                </div>
            </footer>
        </motion.div>
    );
}
