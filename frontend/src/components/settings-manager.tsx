'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Layout, Save,
    Loader2, Brain, Database, Shield, Zap,
    ArrowRight, Check, Sliders, Server
} from 'lucide-react';
import { useSettings, AppSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

export function SettingsManager({ onClose, workspaceId, workspaceName }: { onClose?: () => void, workspaceId?: string, workspaceName?: string }) {
    const { settings, updateSettings, isLoading } = useSettings(workspaceId);
    const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'llm' | 'retrieval' | 'system'>('llm');

    if (isLoading || !settings) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center gap-4",
                onClose ? "fixed inset-0 z-[100] bg-[#0a0a0b]/80 backdrop-blur-xl" : "h-[400px] w-full"
            )}>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-gray-500 text-tiny font-bold uppercase tracking-widest animate-pulse">Syncing Kernel Settings...</span>
            </div>
        );
    }

    const current = { ...settings, ...localSettings };

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

    const handleChange = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const tabs = [
        { id: 'llm', label: 'Intelligence', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 'retrieval', label: 'Retrieval', icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
        { id: 'system', label: 'Interface', icon: Sliders, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ] as const;

    const content = (
        <motion.div
            initial={onClose ? { opacity: 0, scale: 0.95, y: 20 } : {}}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={onClose ? { opacity: 0, scale: 0.95, y: 20 } : {}}
            className={cn(
                "relative bg-[#121214] border border-white/10 w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col",
                onClose ? "max-w-4xl h-[700px] max-h-[90vh]" : "h-full"
            )}
        >
            {/* Header Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />

            {/* Top Bar */}
            <div className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                        <Settings className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black text-white tracking-tight uppercase">
                            {workspaceName ? workspaceName : 'Core System'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-tiny font-bold text-gray-500 uppercase tracking-[0.2em]">Parameter Configuration</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <code className="text-tiny text-indigo-400">ID: {workspaceId || 'GLOBAL'}</code>
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 active:scale-90"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Navigation Sidebar */}
                <div className="w-64 border-r border-white/5 p-6 flex flex-col gap-3 bg-white/[0.01] shrink-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative overflow-hidden",
                                activeTab === tab.id
                                    ? "bg-white text-black shadow-xl"
                                    : "hover:bg-white/5 text-gray-500 hover:text-white"
                            )}
                        >
                            <tab.icon size={20} className={cn("shrink-0", activeTab === tab.id ? "text-black" : tab.color)} />
                            <span className="text-tiny font-black uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabGlow"
                                    className="absolute inset-0 bg-white opacity-10 blur-xl"
                                />
                            )}
                        </button>
                    ))}

                    <div className="mt-auto p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-3 mb-3">
                            <Shield size={14} className="text-indigo-400" />
                            <span className="text-tiny font-black text-indigo-400 uppercase tracking-widest">Security Mode</span>
                        </div>
                        <p className="text-tiny text-gray-600 leading-relaxed font-medium">
                            Settings are isolated per environment to ensure strict data compartmentalization.
                        </p>
                    </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-white/[0.005]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-xl mx-auto space-y-10"
                        >
                            {activeTab === 'llm' && (
                                <>
                                    <section className="space-y-6">
                                        <header className="flex items-center gap-3 pb-2 border-b border-white/5">
                                            <Zap size={14} className="text-amber-400" />
                                            <h3 className="text-tiny font-black text-gray-500 uppercase tracking-[0.25em]">Response Engine</h3>
                                        </header>

                                        <div className="grid gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-tiny font-black text-gray-600 uppercase tracking-widest ml-1">AI Provider</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {['openai', 'anthropic', 'ollama', 'vllm', 'llama-cpp'].map((prov) => (
                                                        <button
                                                            key={prov}
                                                            onClick={() => handleChange('llm_provider', prov)}
                                                            className={cn(
                                                                "px-4 py-4 rounded-2xl border text-tiny font-black uppercase tracking-tighter transition-all",
                                                                current.llm_provider === prov
                                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                                                                    : "bg-[#0a0a0b] border-white/5 text-gray-600 hover:border-white/10 hover:text-gray-400"
                                                            )}
                                                        >
                                                            {prov}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="block text-tiny font-black text-gray-600 uppercase tracking-widest ml-1">Target Model</label>
                                                <div className="relative group">
                                                    <Server className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-blue-500 transition-colors" size={18} />
                                                    <input
                                                        type="text"
                                                        value={current.llm_model}
                                                        onChange={e => handleChange('llm_model', e.target.value)}
                                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-caption text-white outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-800"
                                                        placeholder="e.g. gpt-4o-latest"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6 pt-4 border-t border-white/5">
                                        <header className="flex items-center gap-3 pb-2 border-b border-white/5">
                                            <Database size={14} className="text-emerald-400" />
                                            <h3 className="text-tiny font-black text-gray-500 uppercase tracking-[0.25em]">Vectorization</h3>
                                        </header>

                                        <div className="space-y-3">
                                            <label className="block text-tiny font-black text-gray-600 uppercase tracking-widest ml-1">Embedding Logic</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { id: 'openai', label: 'Cloud (OpenAI)', sub: 'Fast & Robust' },
                                                    { id: 'local', label: 'Local (HuggingFace)', sub: 'Privacy First' },
                                                    { id: 'ollama', label: 'Local (Ollama)', sub: 'Neural Engine' },
                                                    { id: 'vllm', label: 'vLLM', sub: 'High Throughput' },
                                                    { id: 'llama-cpp', label: 'Llama.cpp', sub: 'Low Latency' }
                                                ].map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleChange('embedding_provider', item.id)}
                                                        className={cn(
                                                            "p-5 rounded-2xl border text-left transition-all",
                                                            current.embedding_provider === item.id
                                                                ? "bg-emerald-600/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                                                                : "bg-[#0a0a0b] border-white/5 hover:border-white/10"
                                                        )}
                                                    >
                                                        <div className={cn("text-tiny font-black uppercase tracking-tighter mb-1", current.embedding_provider === item.id ? "text-emerald-400" : "text-gray-400")}>
                                                            {item.label}
                                                        </div>
                                                        <div className="text-tiny text-gray-600 font-bold">{item.sub}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {activeTab === 'retrieval' && (
                                <div className="space-y-10">
                                    <section className="space-y-6">
                                        <header className="flex items-center gap-3 pb-2 border-b border-white/5">
                                            <Search size={14} className="text-indigo-400" />
                                            <h3 className="text-tiny font-black text-gray-500 uppercase tracking-[0.25em]">Search Pipeline</h3>
                                        </header>

                                        <div className="space-y-4">
                                            <label className="block text-tiny font-black text-gray-600 uppercase tracking-widest ml-1">Strategy</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { id: 'hybrid', label: 'Neural Hybrid', sub: 'Semantic + Keyword matching (Recommended)', color: 'blue' },
                                                    { id: 'vector', label: 'Pure Vector', sub: 'Conceptual understanding only', color: 'indigo' },
                                                    { id: 'keyword', label: 'Strict Keyword', sub: 'Exact text overlap matches', color: 'purple' },
                                                ].map((mode) => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => handleChange('retrieval_mode', mode.id)}
                                                        className={cn(
                                                            "flex items-center justify-between p-6 rounded-[2rem] border transition-all text-left group",
                                                            current.retrieval_mode === mode.id
                                                                ? "bg-white border-white shadow-xl"
                                                                : "bg-[#0a0a0b] border-white/5 hover:border-white/10"
                                                        )}
                                                    >
                                                        <div>
                                                            <div className={cn("text-tiny font-black uppercase tracking-widest mb-1", current.retrieval_mode === mode.id ? "text-black" : "text-gray-300")}>
                                                                {mode.label}
                                                            </div>
                                                            <div className={cn("text-tiny font-medium", current.retrieval_mode === mode.id ? "text-gray-600" : "text-gray-500")}>
                                                                {mode.sub}
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                            current.retrieval_mode === mode.id ? "bg-black border-black text-white" : "border-white/10 text-transparent"
                                                        )}>
                                                            <Check size={12} />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-8 pt-4">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <label className="text-tiny font-black text-gray-600 uppercase tracking-widest">Expansion Threshold</label>
                                                    <p className="text-tiny text-gray-700 font-bold uppercase">Number of context chunks to retrieve</p>
                                                </div>
                                                <span className="text-h3 font-black text-white">{current.search_limit}</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="25" step="1"
                                                value={current.search_limit}
                                                onChange={e => handleChange('search_limit', parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>

                                        {current.retrieval_mode === 'hybrid' && (
                                            <div className="space-y-6 p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
                                                <div className="flex justify-between items-end">
                                                    <div className="space-y-1">
                                                        <label className="text-tiny font-black text-indigo-400 uppercase tracking-widest">Hybrid Weighting (Alpha)</label>
                                                        <p className="text-tiny text-indigo-400/50 font-bold uppercase">Balance Concept vs. Exact Matches</p>
                                                    </div>
                                                    <span className="text-h3 font-black text-indigo-400">{current.hybrid_alpha}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.1"
                                                    value={current.hybrid_alpha}
                                                    onChange={e => handleChange('hybrid_alpha', parseFloat(e.target.value))}
                                                    className="w-full h-1.5 bg-indigo-500/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                                />
                                                <div className="flex justify-between text-tiny font-black text-indigo-400/40 uppercase tracking-widest">
                                                    <span>Strict BM25</span>
                                                    <span>Dense Vector</span>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-8">
                                    <section className="space-y-6">
                                        <header className="flex items-center gap-3 pb-2 border-b border-white/5">
                                            <Layout size={14} className="text-purple-400" />
                                            <h3 className="text-tiny font-black text-gray-500 uppercase tracking-[0.25em]">User Experience</h3>
                                        </header>

                                        <div className="grid gap-4">
                                            <button
                                                onClick={() => handleChange('show_reasoning', !current.show_reasoning)}
                                                className={cn(
                                                    "flex items-center justify-between p-7 rounded-[2.5rem] border transition-all group",
                                                    current.show_reasoning
                                                        ? "bg-purple-600/10 border-purple-500/50 ring-1 ring-purple-500/30"
                                                        : "bg-[#0a0a0b] border-white/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                                        current.show_reasoning ? "bg-purple-500 text-white" : "bg-white/5 text-gray-600"
                                                    )}>
                                                        <Brain size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={cn("text-caption font-black uppercase tracking-tight mb-1", current.show_reasoning ? "text-purple-400" : "text-gray-400")}>
                                                            Thinking Transparency
                                                        </div>
                                                        <div className="text-tiny text-gray-600 font-bold leading-relaxed max-w-[240px]">
                                                            Reveal the AI's step-by-step internal reasoning process in the UI.
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-12 h-6 rounded-full p-1 transition-all relative",
                                                    current.show_reasoning ? "bg-purple-500" : "bg-white/10"
                                                )}>
                                                    <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", current.show_reasoning ? "ml-6" : "ml-0")} />
                                                </div>
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Sync Footer */}
            <div className="px-10 py-8 border-t border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                <div className="flex items-center gap-4 text-gray-600">
                    <ArrowRight size={14} className="animate-pulse" />
                    <span className="text-tiny font-black uppercase tracking-widest">Kernel Ready</span>
                </div>

                <div className="flex items-center gap-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-6 py-4 text-tiny font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                        >
                            Discard
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(localSettings).length === 0}
                        className="group flex items-center gap-3 px-8 py-4 bg-white disabled:opacity-30 disabled:hover:scale-100 text-black text-tiny font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none focus:ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#121214]"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Sync Core
                    </button>
                </div>
            </div>
        </motion.div>
    );

    if (onClose) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md"
                />
                {content}
            </div>
        );
    }

    return content;
}
