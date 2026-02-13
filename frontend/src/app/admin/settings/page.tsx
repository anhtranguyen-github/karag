'use client';

import React, { useState } from 'react';
import { useSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { Settings, Check, Loader2, Info, AlertCircle, RefreshCw, Sliders, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PROVIDER_SETTING_KEYS } from '@/lib/constants';

export default function GlobalSettingsPage() {
    const { settings, updateSettings, isLoading, refreshSettings } = useSettings();
    const { metadata, isLoading: isLoadingMeta } = useSettingsMetadata();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const handleUpdate = async (key: string, value: string | number | boolean) => {
        setIsSaving(key);
        await updateSettings({ [key]: value });
        setTimeout(() => setIsSaving(null), 1000);
    };

    if (isLoading || isLoadingMeta || !settings || !metadata) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Filter out provider-specific fields
    const settingFields = Object.keys(settings).filter(k => !PROVIDER_SETTING_KEYS.includes(k));

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 font-black uppercase tracking-tighter mb-2">Global Config</h1>
                    <p className="text-caption text-gray-500 max-w-xl">
                        Tweak application-wide behaviors, search sensitivity, and UI defaults.
                    </p>
                </div>
                <button
                    onClick={() => refreshSettings()}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <RefreshCw size={20} />
                </button>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {settingFields.map((key) => {
                    const value = settings[key as keyof typeof settings];
                    const meta = metadata[key];
                    const isBool = typeof value === 'boolean';
                    const isNum = typeof value === 'number';

                    return (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#121214] border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-8 group hover:border-white/10 transition-all"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                                    {isBool ? <Eye size={20} /> : <Sliders size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-caption font-bold text-white capitalize">{key.replace(/_/g, ' ')}</h3>
                                        {meta && !meta.mutable && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Fixed</span>
                                        )}
                                    </div>
                                    <p className="text-tiny text-gray-600 font-medium">{meta?.description || 'System parameter configuration.'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {isBool ? (
                                    <button
                                        onClick={() => handleUpdate(key, !value)}
                                        disabled={!meta?.mutable}
                                        className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                                            value ? "bg-indigo-600" : "bg-white/10"
                                        )}
                                    >
                                        <motion.div
                                            animate={{ x: value ? 24 : 0 }}
                                            className="w-4 h-4 rounded-full bg-white shadow-lg"
                                        />
                                    </button>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type={isNum ? "number" : "text"}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-caption font-bold text-white w-32 focus:outline-none focus:ring-2 ring-indigo-500/50"
                                            value={value as string | number}
                                            onChange={(e) => {
                                                const val = isNum ? parseFloat(e.target.value) : e.target.value;
                                                handleUpdate(key, val);
                                            }}
                                            disabled={!meta?.mutable}
                                        />
                                    </div>
                                )}

                                <div className="w-6 flex items-center justify-center">
                                    <AnimatePresence>
                                        {isSaving === key && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="text-emerald-500"
                                            >
                                                <Check size={16} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
