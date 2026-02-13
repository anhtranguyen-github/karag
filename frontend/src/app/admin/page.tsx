'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Database, Activity, Zap, ShieldCheck, ArrowRight,
    Check, Loader2, AlertCircle, RefreshCw, Sliders, Eye,
    ExternalLink, Layers, Server, Users, AlertTriangle, Info, Save
} from 'lucide-react';
import Link from 'next/link';
import { useSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { PROVIDER_SETTING_KEYS } from '@/lib/constants';
import { API_ROUTES, EXTERNAL_SERVICES } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type AdminTab = 'overview' | 'providers' | 'settings' | 'observability';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'providers', label: 'AI Providers', icon: Cpu },
    { id: 'settings', label: 'Global Config', icon: Sliders },
    { id: 'observability', label: 'Observability', icon: Activity },
];

export default function AdminConsolePage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const { settings, updateSettings, isLoading: settingsLoading, refreshSettings } = useSettings();
    const { metadata, isLoading: metaLoading, error: metaError, refreshSettings: refreshMetadata } = useSettingsMetadata();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Metrics state
    const [rawMetrics, setRawMetrics] = useState('');
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [lastMetricsSync, setLastMetricsSync] = useState<Date | null>(null);

    const fetchMetrics = useCallback(async () => {
        setMetricsLoading(true);
        try {
            const res = await fetch(API_ROUTES.METRICS);
            if (res.ok) {
                setRawMetrics(await res.text());
                setMetricsError(null);
                setLastMetricsSync(new Date());
            } else {
                setMetricsError('Prometheus endpoint unreachable.');
            }
        } catch {
            setMetricsError('Connection failed.');
        } finally {
            setMetricsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 15000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    const parseMetric = (name: string) => {
        const regex = new RegExp(`^${name}(?:\\{[^\\}]*\\})?\\s+([\\d\\.]+)`, 'm');
        const match = rawMetrics.match(regex);
        return match ? parseFloat(match[1]) : 0;
    };

    const handleSettingUpdate = async (key: string, value: string | number | boolean) => {
        setIsSaving(key);
        await updateSettings({ [key]: value });
        setTimeout(() => setIsSaving(null), 1000);
    };

    const isLoading = settingsLoading || metaLoading;

    const providerFields = [
        { key: 'llm_provider', label: 'LLM Provider', type: 'select' },
        { key: 'llm_model', label: 'Inference Model', type: 'text' },
        { key: 'embedding_provider', label: 'Embedding Provider', type: 'select' },
        { key: 'embedding_model', label: 'Embedding Model', type: 'text' },
    ];

    const dashboardMetrics = [
        { label: 'Total Requests', value: parseMetric('http_requests_total'), icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Active Streams', value: parseMetric('active_chat_streams'), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'System Errors', value: parseMetric('http_errors_total'), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Vector Ops', value: parseMetric('vector_store_operation_duration_seconds_count'), icon: Server, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-h1 font-black   mb-1">System Control</h1>
                    <p className="text-caption text-gray-500 max-w-2xl">
                        Centralized orchestration for ScienChan&apos;s neural fabric. Configure, monitor, and audit.
                    </p>
                </div>
                <button
                    onClick={() => { refreshSettings(); refreshMetadata(); fetchMetrics(); }}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Refresh all"
                >
                    <RefreshCw size={20} />
                </button>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-[#0e0e10] rounded-2xl p-1.5 border border-white/5 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-tiny font-bold   transition-all whitespace-nowrap relative",
                            activeTab === tab.id
                                ? "bg-white/10 text-white"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        )}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="admin-tab-indicator"
                                className="absolute inset-0 bg-white/10 rounded-xl -z-10"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-8"
                    >
                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'AI Providers', value: settings ? `${settings.llm_provider} / ${settings.embedding_provider}` : '...', icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                { label: 'Global Settings', value: metadata ? `${Object.keys(metadata).length} Params` : '...', icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                                { label: 'System Health', value: metricsError ? 'Offline' : 'Healthy', icon: Activity, color: metricsError ? 'text-red-400' : 'text-emerald-400', bg: metricsError ? 'bg-red-500/10' : 'bg-emerald-500/10' },
                                { label: 'Trace Spans', value: `${parseMetric('http_requests_total').toLocaleString()}/hr`, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="bg-[#121214] border border-white/5 p-5 rounded-2xl flex flex-col gap-3 group hover:border-white/10 transition-all"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-500   mb-0.5">{stat.label}</div>
                                        <div className="text-caption font-black text-white truncate">{stat.value}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Security + Providers Summary side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Security */}
                            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={180} />
                                </div>
                                <h3 className="text-caption font-black   mb-4">Security & Orchestration</h3>
                                <div className="space-y-3">
                                    {[
                                        { color: 'bg-emerald-500', title: 'RBAC Isolation Active', desc: 'Workspace-level data isolation enforced. No cross-tenant leakage.' },
                                        { color: 'bg-blue-500', title: 'Provider Failover Ready', desc: 'Secondary providers configured. Auto-fallback on latency > 5s.' },
                                        { color: 'bg-amber-500', title: 'Telemetry Streaming', desc: 'OTEL spans exported to collector. Full request lifecycle visibility.' },
                                    ].map((item) => (
                                        <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.color} mt-1.5 shrink-0`} />
                                            <div>
                                                <div className="text-tiny font-bold text-white">{item.title}</div>
                                                <p className="text-[10px] text-gray-500">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Config Summary */}
                            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                                <h3 className="text-caption font-black   mb-4">Active Configuration</h3>
                                {settings ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'LLM Provider', value: settings.llm_provider },
                                            { label: 'LLM Model', value: settings.llm_model },
                                            { label: 'Embedding', value: settings.embedding_model },
                                            { label: 'Search Limit', value: String(settings.search_limit) },
                                            { label: 'Hybrid Alpha', value: String(settings.hybrid_alpha) },
                                            { label: 'Reasoning', value: settings.show_reasoning ? 'Enabled' : 'Disabled' },
                                        ].map((item) => (
                                            <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <div className="text-[10px] font-black text-gray-600  ">{item.label}</div>
                                                <div className="text-tiny font-bold text-white mt-0.5 truncate">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-32">
                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {dashboardMetrics.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="bg-[#121214] border border-white/5 p-4 rounded-2xl flex items-center gap-4"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shrink-0`}>
                                        <stat.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-500  ">{stat.label}</div>
                                        <div className="text-caption font-black text-white">{stat.value.toLocaleString()}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'providers' && (
                    <motion.div
                        key="providers"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-6"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[40vh]">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            </div>
                        ) : !settings || !metadata ? (
                            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
                                <AlertCircle size={40} className="text-red-500" />
                                <p className="text-caption text-gray-500">{metaError || 'Provider sync failed.'}</p>
                                <button onClick={() => { refreshMetadata(); refreshSettings(); }} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-tiny font-bold text-white   hover:bg-white/10 transition-all">
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {providerFields.map((field) => (
                                    <motion.div
                                        key={field.key}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 group hover:border-white/10 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                                <Cpu size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-tiny font-black   text-white">{field.label}</h3>
                                                    {metadata[field.key] && !metadata[field.key].mutable && (
                                                        <span className="text-[9px] font-black   text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Fixed</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-600 truncate">{metadata[field.key]?.description || 'Provider configuration.'}</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            {field.type === 'select' && metadata[field.key]?.options ? (
                                                <select
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-tiny font-bold text-white focus:outline-none focus:ring-2 ring-indigo-500/50 appearance-none"
                                                    value={settings[field.key as keyof typeof settings] as string}
                                                    onChange={(e) => handleSettingUpdate(field.key, e.target.value)}
                                                    disabled={!metadata[field.key]?.mutable}
                                                >
                                                    {metadata[field.key]?.options?.map(opt => (
                                                        <option key={opt} value={opt} className="bg-[#0a0a0b] text-white">{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-tiny font-bold text-white focus:outline-none focus:ring-2 ring-indigo-500/50"
                                                    defaultValue={settings[field.key as keyof typeof settings] as string}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== settings[field.key as keyof typeof settings]) {
                                                            handleSettingUpdate(field.key, e.target.value);
                                                        }
                                                    }}
                                                    disabled={!metadata[field.key]?.mutable}
                                                />
                                            )}
                                            <AnimatePresence>
                                                {isSaving === field.key && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                                                    >
                                                        <Check size={14} />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        <div className="p-5 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                <Info size={20} />
                            </div>
                            <div>
                                <h4 className="text-tiny font-bold text-indigo-400 mb-1">Architectural Guardrails</h4>
                                <p className="text-[10px] text-indigo-300/60 leading-relaxed font-bold  ">
                                    Immutable parameters require full environment rebuild via CLI. Fixed fields cannot be changed at runtime.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-6"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[40vh]">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            </div>
                        ) : !settings || !metadata ? (
                            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
                                <AlertCircle size={40} className="text-red-500" />
                                <p className="text-caption text-gray-500">{metaError || 'Config sync failed.'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {Object.keys(settings).filter(k => !PROVIDER_SETTING_KEYS.includes(k)).map((key) => {
                                    const value = settings[key as keyof typeof settings];
                                    const meta = metadata[key];
                                    const isBool = typeof value === 'boolean';
                                    const isNum = typeof value === 'number';

                                    return (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-white/10 transition-all"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors shrink-0">
                                                    {isBool ? <Eye size={16} /> : <Sliders size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-tiny font-bold text-white capitalize truncate">{key.replace(/_/g, ' ')}</h3>
                                                        {meta && !meta.mutable && (
                                                            <span className="text-[9px] font-black   text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 shrink-0">Fixed</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-600 truncate">{meta?.description || 'System parameter.'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {isBool ? (
                                                    <button
                                                        onClick={() => handleSettingUpdate(key, !value)}
                                                        disabled={!meta?.mutable}
                                                        className={cn(
                                                            "w-10 h-5 rounded-full p-0.5 transition-all duration-300 relative",
                                                            value ? "bg-indigo-600" : "bg-white/10"
                                                        )}
                                                    >
                                                        <motion.div
                                                            animate={{ x: value ? 20 : 0 }}
                                                            className="w-4 h-4 rounded-full bg-white shadow-lg"
                                                        />
                                                    </button>
                                                ) : (
                                                    <input
                                                        type={isNum ? "number" : "text"}
                                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-tiny font-bold text-white w-24 focus:outline-none focus:ring-2 ring-indigo-500/50"
                                                        value={value as string | number}
                                                        onChange={(e) => {
                                                            const val = isNum ? parseFloat(e.target.value) : e.target.value;
                                                            handleSettingUpdate(key, val);
                                                        }}
                                                        disabled={!meta?.mutable}
                                                    />
                                                )}

                                                <div className="w-4 flex items-center justify-center">
                                                    <AnimatePresence>
                                                        {isSaving === key && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                className="text-emerald-500"
                                                            >
                                                                <Check size={12} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'observability' && (
                    <motion.div
                        key="observability"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-6"
                    >
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {dashboardMetrics.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="bg-[#121214] border border-white/5 p-4 rounded-2xl flex items-center gap-4"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shrink-0`}>
                                        <stat.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-500  ">{stat.label}</div>
                                        <div className="text-caption font-black text-white">{stat.value.toLocaleString()}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Traces + Raw Metrics side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Jaeger / Tracing */}
                            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                    <Layers size={140} />
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-caption font-black   mb-2">Distributed Tracing</h3>
                                    <p className="text-[10px] text-gray-500 leading-relaxed mb-4">
                                        OTEL-instrumented spans for RAG operations, embeddings, and LLM inference. Deep analysis via Jaeger.
                                    </p>
                                    <a
                                        href={EXTERNAL_SERVICES.JAEGER}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black   text-[10px] hover:bg-amber-400 transition-all shadow-lg shadow-amber-900/20"
                                    >
                                        Open Jaeger <ExternalLink size={12} />
                                    </a>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-gray-600  ">Service</div>
                                        <div className="text-tiny font-bold text-white">scienchan-backend</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-gray-600  ">Sample Rate</div>
                                        <div className="text-tiny font-bold text-white">100% (Debug)</div>
                                    </div>
                                </div>
                            </div>

                            {/* Raw Metrics */}
                            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-caption font-black  ">Prometheus Export</h3>
                                    <div className="flex items-center gap-2">
                                        {lastMetricsSync && (
                                            <span className="text-[9px] font-bold text-gray-600   bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                {lastMetricsSync.toLocaleTimeString()}
                                            </span>
                                        )}
                                        <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black   text-emerald-500">
                                            Live
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#121214] pointer-events-none z-10" />
                                    <pre className="text-[9px] text-gray-600 font-mono overflow-y-auto max-h-[260px] custom-scrollbar p-4 bg-black/20 rounded-xl border border-white/5 leading-relaxed">
                                        {metricsLoading ? 'Initializing telemetry...' : metricsError || rawMetrics || 'No metrics data.'}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Health Sidebars */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: ShieldCheck, color: 'text-emerald-500', title: 'Health Sync', desc: 'Telemetry instrumentation embedded in kernel. Async OTLP export active.' },
                                { icon: Activity, color: 'text-blue-500', title: 'Latency Focus', desc: 'Automatic p99 outlier detection in retrieval and embedding stages.' },
                                { icon: Info, color: 'text-amber-400', title: 'Developer Note', desc: 'Ensure OTEL_ENABLED=true and collector container is active for trace capture.' },
                            ].map((item) => (
                                <div key={item.title} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <item.icon size={14} className={item.color} />
                                        <span className="text-[10px] font-black   text-white">{item.title}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
