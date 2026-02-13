'use client';

import React, { useState } from 'react';
import { useSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { Cpu, Check, Loader2, Info, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ProvidersPage() {
    const { settings, updateSettings, isLoading, refreshSettings } = useSettings();
    const { metadata, isLoading: isLoadingMeta, error, refreshSettings: refreshMetadata } = useSettingsMetadata();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const providerFields = [
        { key: 'llm_provider', label: 'LLM Engine Provider', type: 'select' },
        { key: 'llm_model', label: 'Inference Model', type: 'text' },
        { key: 'embedding_provider', label: 'Embedding Engine Provider', type: 'select' },
        { key: 'embedding_model', label: 'Vectorization Model', type: 'text' },
    ];

    const handleUpdate = async (key: string, value: string) => {
        setIsSaving(key);
        await updateSettings({ [key]: value });
        setTimeout(() => setIsSaving(null), 1000);
    };

    if (isLoading || isLoadingMeta) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !settings || !metadata) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 p-10">
                <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertCircle size={40} />
                </div>
                <div>
                    <h2 className="text-h2 font-black uppercase tracking-tighter text-white mb-2">Protocol Failure</h2>
                    <p className="text-caption text-gray-500 max-w-md">{error || "Neural settings synchronization failed."}</p>
                </div>
                <button
                    onClick={() => { refreshMetadata(); refreshSettings(); }}
                    className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-caption font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                    Retry Core Sync
                </button>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 font-black uppercase tracking-tighter mb-2">Neural Providers</h1>
                    <p className="text-caption text-gray-500 max-w-xl">
                        Configure the primary and secondary AI engines. Changes here affect global inference and vectorization protocols.
                    </p>
                </div>
                <button
                    onClick={() => refreshSettings()}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <RefreshCw size={20} />
                </button>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {providerFields.map((field) => (
                    <motion.div
                        key={field.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#121214] border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center gap-8 group hover:border-white/10 transition-all"
                    >
                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                            <Cpu size={32} />
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-caption font-black uppercase tracking-widest text-white">{field.label}</h3>
                                {metadata[field.key] && !metadata[field.key].mutable && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-tiny font-bold text-amber-500">
                                        <AlertCircle size={10} /> Immutable
                                    </div>
                                )}
                            </div>
                            <p className="text-tiny text-gray-600 font-medium">{metadata[field.key]?.description || 'No description available for this parameter.'}</p>
                        </div>

                        <div className="md:w-72 relative">
                            {field.type === 'select' && metadata[field.key]?.options ? (
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-caption font-bold text-white focus:outline-none focus:ring-2 ring-indigo-500/50 appearance-none"
                                    value={settings[field.key as keyof typeof settings] as string}
                                    onChange={(e) => handleUpdate(field.key, e.target.value)}
                                    disabled={!metadata[field.key]?.mutable}
                                >
                                    {metadata[field.key]?.options?.map(opt => (
                                        <option key={opt} value={opt} className="bg-[#0a0a0b] text-white">{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-caption font-bold text-white focus:outline-none focus:ring-2 ring-indigo-500/50"
                                    value={settings[field.key as keyof typeof settings] as string}
                                    onBlur={(e) => {
                                        if (e.target.value !== settings[field.key as keyof typeof settings]) {
                                            handleUpdate(field.key, e.target.value);
                                        }
                                    }}
                                    defaultValue={settings[field.key as keyof typeof settings] as string}
                                    disabled={!metadata[field.key]?.mutable}
                                />
                            )}

                            <AnimatePresence>
                                {isSaving === field.key && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute -right-10 top-1/2 -translate-y-1/2 text-emerald-500"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Check size={14} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="p-8 rounded-[2.5rem] bg-indigo-600/5 border border-indigo-500/10 flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Info size={24} />
                </div>
                <div>
                    <h4 className="text-caption font-bold text-indigo-400 mb-2">Architectural Guardrails</h4>
                    <p className="text-tiny text-indigo-300/60 leading-relaxed font-bold uppercase tracking-widest">
                        Core parameters (Immutable) require systemic reconfiguration. If you need to change the embedding dimension or infrastructure root, please perform a full environment rebuild via the CLI.
                    </p>
                </div>
            </div>
        </div>
    );
}
