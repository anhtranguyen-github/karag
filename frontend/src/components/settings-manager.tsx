'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Search, Save,
    Loader2, Brain,
    Check, Lock, SlidersHorizontal, Cpu, Sparkles, Database
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
                "flex flex-col items-center justify-center gap-8",
                onClose ? "fixed inset-0 z-[100] bg-background/80 backdrop-blur-2xl" : "h-[500px] w-full"
            )}>
                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-[2.5rem] border border-indigo-500/20 animate-pulse" />
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground tracking-[0.4em] animate-pulse">Loading settings</span>
                    <span className="text-[9px] text-muted-foreground/40 font-bold tracking-widest">Identifying workspace...</span>
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
        { id: 'generation', label: 'Chat', icon: Brain },
        { id: 'retrieval', label: 'Search', icon: Search },
        { id: 'infrastructure', label: 'Storage', icon: Database },
        { id: 'interface', label: 'System', icon: SlidersHorizontal },
    ] as const;

    const renderSettingRow = (key: keyof AppSettings, label: string, description: string) => {
        const fieldMeta = metadata[key];
        const mutable = isMutable(key);
        const value = current[key];

        if (!fieldMeta) return null;

        const renderInput = () => {
            if (fieldMeta.field_type === 'select' && fieldMeta.options) {
                return (
                    <div className="relative w-full max-w-[320px]">
                        <select
                            value={value as string}
                            disabled={!mutable}
                            onChange={(e) => handleSettingChange(key, e.target.value)}
                            className={cn(
                                "w-full bg-secondary/40 border border-border rounded-2xl px-5 py-3 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all appearance-none cursor-pointer",
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
                const step = fieldMeta.step ?? (fieldMeta.field_type === 'float' ? 0.1 : 1);

                return (
                    <div className="flex flex-col items-end gap-3 w-full max-w-[280px]">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
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
                            "w-full bg-secondary/40 border border-border rounded-2xl px-5 py-3 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all",
                            !mutable && "cursor-not-allowed opacity-60"
                        )}
                        placeholder="System Default"
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
                            <p className="text-[11px] font-bold text-foreground tracking-widest">{label}</p>
                            {!mutable && (
                                <div className="px-1.5 py-0.5 rounded-md bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-1">
                                    <Lock size={8} className="text-indigo-500" />
                                    <span className="text-[8px] font-bold text-indigo-500 tracking-widest">Protected</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium max-w-xl opacity-60 group-hover:opacity-100 transition-opacity">
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
            className="relative w-full h-full flex flex-col bg-background"
        >
            {/* Minimal High-End Header */}
            <header className="px-12 py-10 flex items-center justify-between border-b border-border bg-secondary/10">
                <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 text-white relative">
                        <Settings size={28} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-background animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-foreground tracking-tighter">
                                {workspaceName || 'Global settings'}
                            </h2>
                            <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-500 tracking-[0.2em]">
                                ID: {workspaceId?.slice(0, 8) || 'system'}
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">Adjust system and chat parameters.</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-indigo-500/30 transition-all active:scale-90"
                    >
                        <X size={20} />
                    </button>
                )}
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Modern Sidebar */}
                <aside className="w-[300px] border-r border-border p-10 flex flex-col gap-2 shrink-0 bg-secondary/5">
                    <div className="px-2 mb-6">
                        <span className="text-[9px] font-bold text-muted-foreground/40 tracking-[0.3em]">Menu</span>
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
                            <div className="flex flex-col items-start gap-0.5">
                                <span className="text-[11px] font-bold tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <span className="text-[8px] font-bold opacity-40 tracking-tighter">Active</span>
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

                    <div className="mt-auto p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hidden xl:flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <Sparkles size={14} />
                            <span className="text-[10px] font-bold tracking-widest">Status</span>
                        </div>
                        <p className="text-[9px] text-indigo-500/60 font-medium leading-relaxed">
                            Changes are applied instantly across your workspace.
                        </p>
                    </div>
                </aside>

                {/* Main Settings Panel */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-16 bg-background">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-4xl mx-auto space-y-12"
                        >
                            {/* Section Header */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 tracking-[0.3em]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    System settings
                                </div>
                                <h3 className="text-4xl font-bold text-foreground tracking-tighter">
                                    {tabs.find(t => t.id === activeTab)?.label} settings
                                </h3>
                                <div className="h-0.5 w-12 bg-indigo-500" />
                            </div>

                            <div className="grid gap-2">
                                {activeTab === 'generation' && (
                                    <>
                                        {renderSettingRow('llm_provider', 'Chat provider', 'The AI service used for chat.')}
                                        {renderSettingRow('llm_model', 'Model', 'The specific AI model used.')}
                                        {renderSettingRow('temperature', 'Creativity', 'Controls how creative or literal the responses are.')}
                                        {renderSettingRow('system_prompt', 'Instructions', 'Core guide defining the assistant behavior.')}
                                        {renderSettingRow('agentic_enabled', 'Use tools', 'Enables the AI to use tools and search for complex tasks.')}
                                    </>
                                )}
                                {activeTab === 'retrieval' && (
                                    <>
                                        {renderSettingRow('rag_engine', 'Search method', 'The methodology used for finding information.')}
                                        {renderSettingRow('search_limit', 'Context limit', 'Number of file fragments used per response.')}
                                        {renderSettingRow('hybrid_alpha', 'Search balance', 'Balance between semantic meaning and exact keyword matches.')}
                                        {renderSettingRow('reranker_enabled', 'Refine results', 'An extra pass to improve result relevance.')}
                                        {renderSettingRow('graph_enabled', 'Use graph', 'Uses document relationships to find better context.')}
                                    </>
                                )}
                                {activeTab === 'infrastructure' && (
                                    <>
                                        <div className="p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-6 mb-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                <Database size={20} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-indigo-500 tracking-widest">Fixed settings</h4>
                                                <p className="text-[11px] text-indigo-500/60 font-medium leading-relaxed">
                                                    Base storage settings are locked for this workspace. Updating these requires re-initialization.
                                                </p>
                                            </div>
                                        </div>
                                        {renderSettingRow('embedding_provider', 'Embedding provider', 'Provider used to process documents.')}
                                        {renderSettingRow('embedding_model', 'Embedding model', 'Model used for document search.')}
                                        {renderSettingRow('chunking_strategy', 'Chunking method', 'How documents are split into smaller pieces.')}
                                        {renderSettingRow('job_concurrency', 'Process speed', 'Number of simultaneous tasks for document processing.')}
                                    </>
                                )}
                                {activeTab === 'interface' && (
                                    <>
                                        {renderSettingRow('show_reasoning', 'Show thinking', 'Display how the AI reached its answer.')}
                                        {renderSettingRow('theme', 'Theme', 'Change the appearance of the interface.')}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Premium Interaction Footer */}
            <footer className="px-12 py-8 border-t border-border flex items-center justify-between shrink-0 bg-secondary/5 backdrop-blur-xl">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 tracking-widest">Connected</span>
                    </div>
                    {Object.keys(localSettings).length > 0 && (
                        <div className="flex items-center gap-3 animate-in slide-in-from-left-4">
                            <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500">
                                {Object.keys(localSettings).length} changes detected
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
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(localSettings).length === 0}
                        className="h-12 px-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[11px] font-bold tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4 group"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save size={16} className="group-hover:rotate-12 transition-transform" />
                        )}
                        Save changes
                    </button>
                </div>
            </footer>
        </motion.div>
    );
}
