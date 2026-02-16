'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Layout, Save,
    Loader2, Brain, Database, Shield, Zap,
    ArrowRight, Check, Sliders, Server, Lock,
    SlidersHorizontal, Cpu, Network, Layers, Sparkles
} from 'lucide-react';
import { useSettings, AppSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { AppSettingsSchema } from '@/lib/schemas/settings';
import { cn } from '@/lib/utils';
import { useError } from '@/context/error-context';

export function SettingsManager({ onClose, workspaceId, workspaceName }: { onClose?: () => void, workspaceId?: string, workspaceName?: string }) {
    const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings(workspaceId);
    const { metadata, isLoading: isMetadataLoading } = useSettingsMetadata();
    const { showError } = useError();

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
                <span className="text-gray-500 text-tiny font-black uppercase tracking-[0.3em] animate-pulse">Syncing Kernel Protocol...</span>
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

    const handleChange = (key: keyof AppSettings, value: any) => {
        if (!isMutable(key as string)) return;
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const tabs = [
        { id: 'generation', label: 'Intelligence', icon: Brain, color: 'text-blue-400' },
        { id: 'retrieval', label: 'Retrieval', icon: Search, color: 'text-indigo-400' },
        { id: 'infrastructure', label: 'Nodes', icon: Cpu, color: 'text-amber-400' },
        { id: 'interface', label: 'Interface', icon: SlidersHorizontal, color: 'text-purple-400' },
    ] as const;

    const renderSettingRow = (key: keyof AppSettings, label: string, description: string) => {
        const mutable = isMutable(key);
        const value = current[key];

        return (
            <div className={cn(
                "group relative p-6 rounded-[2rem] border transition-all",
                mutable ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-white/[0.01] border-white/5 opacity-80"
            )}>
                <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <p className="text-tiny font-black text-white uppercase tracking-tight">{label}</p>
                            {!mutable && <Lock size={10} className="text-gray-600" />}
                        </div>
                        <p className="text-[10px] text-gray-600 font-bold leading-relaxed">{description}</p>
                    </div>

                    <div className="shrink-0 min-w-[140px] flex justify-end">
                        {typeof value === 'boolean' ? (
                            <button
                                disabled={!mutable}
                                onClick={() => handleChange(key, !value)}
                                className={cn(
                                    "w-12 h-6 rounded-full p-1 transition-all relative",
                                    value ? "bg-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/10",
                                    !mutable && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <div className={cn("w-4 h-4 rounded-full bg-white transition-all", value ? "ml-6" : "ml-0")} />
                            </button>
                        ) : typeof value === 'number' ? (
                            <div className="flex flex-col items-end gap-2 w-full">
                                <span className="text-caption font-black text-white">{value}</span>
                                <input
                                    type="range"
                                    min={metadata[key]?.category === 'Retrieval Node' && key === 'hybrid_alpha' ? 0 : 1}
                                    max={key === 'hybrid_alpha' ? 1 : 100}
                                    step={key === 'hybrid_alpha' ? 0.1 : 1}
                                    value={value}
                                    disabled={!mutable}
                                    onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={value as string}
                                disabled={!mutable}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className={cn(
                                    "w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all",
                                    !mutable && "cursor-not-allowed text-gray-600"
                                )}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className={cn(
                "relative bg-[#0d0d0e] border border-white/10 w-full rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col",
                onClose ? "max-w-5xl h-[760px] max-h-[90vh]" : "h-full"
            )}
        >
            {/* Header */}
            <header className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-600/20 text-white">
                        <Settings size={28} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black text-white uppercase tracking-tighter">
                            {workspaceName || 'Control Matrix'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest ">Parameter Protocol</span>
                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                            <code className="text-[9px] font-mono text-blue-500/80 uppercase">Root: {workspaceId || 'system_master'}</code>
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
                <aside className="w-72 border-r border-white/5 p-8 flex flex-col gap-3 shrink-0 bg-[#0a0a0b]/50">
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

                    <div className="mt-auto p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Enforcement</span>
                        </div>
                        <p className="text-[10px] text-gray-600 leading-relaxed font-bold uppercase tracking-tight">
                            Structural nodes are immutable post-initialization to ensure vectorized knowledge integrity.
                        </p>
                    </div>
                </aside>

                {/* Main Settings Panel */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Section Intro */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                                <div>
                                    <h3 className="text-caption font-black text-white uppercase tracking-widest">
                                        {tabs.find(t => t.id === activeTab)?.label} Settings
                                    </h3>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Core Calibration Node</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {activeTab === 'generation' && (
                                    <>
                                        {renderSettingRow('llm_provider', 'Reasoning Engine', 'Cluster provider for logical processing')}
                                        {renderSettingRow('llm_model', 'Intelligence Module', 'Neural weights utilized for generation')}
                                        {renderSettingRow('temperature', 'Creativity Index', 'Variance of token selection probability')}
                                        {renderSettingRow('max_tokens', 'Buffer Limit', 'Maximum length of response transmission')}
                                    </>
                                )}
                                {activeTab === 'retrieval' && (
                                    <>
                                        {renderSettingRow('search_limit', 'Expansion Span', 'Number of documents retrieved per query')}
                                        {renderSettingRow('hybrid_alpha', 'Retrieval Matrix', 'Balance between semantic and lexical weights')}
                                        {renderSettingRow('reranker_enabled', 'Verified Filtering', 'Enable neural reranking for high precision')}
                                        {renderSettingRow('agentic_enabled', 'Autonomous Mode', 'Allow AI to plan multi-step research tasks')}
                                    </>
                                )}
                                {activeTab === 'infrastructure' && (
                                    <>
                                        <div className="p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-4 mb-4">
                                            <Sparkles size={18} className="text-blue-400 mt-1" />
                                            <p className="text-[11px] text-blue-400/80 font-bold leading-relaxed italic">
                                                Structural infrastructure settings define the dimensionality of your workspace. To modify these, a full re-initialization is required.
                                            </p>
                                        </div>
                                        {renderSettingRow('embedding_provider', 'Vector Base', 'Provider for semantic transformations')}
                                        {renderSettingRow('embedding_model', 'Geometric Map', 'Embedding model defining semantic space')}
                                        {renderSettingRow('rag_engine', 'Retrieval Architecture', 'Methodology for knowledge extraction')}
                                        {renderSettingRow('graph_enabled', 'Semantic Web', 'Utilize Neo4j relationships for context')}
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

            {/* Sticky Interaction Bar */}
            <footer className="px-10 py-8 border-t border-white/5 flex items-center justify-between bg-[#0a0a0b]/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Protocol Verified</span>
                    </div>
                    {Object.keys(localSettings).length > 0 && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {Object.keys(localSettings).length} Unsynced Delta
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
                        Sync Core
                    </button>
                </div>
            </footer>
        </motion.div>
    );
}
