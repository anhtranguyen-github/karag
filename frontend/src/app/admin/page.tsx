'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Database, Activity, Zap, ShieldCheck, ArrowRight,
    Check, Loader2, AlertCircle, RefreshCw, Sliders, Eye,
    ExternalLink, Layers, Server, Users, AlertTriangle, Info,
    Target, PlayCircle, CheckCircle2, Plus, Terminal,
    Shield, BarChart4, Clock, HardDrive, Package, GitBranch,
    Search, FileText, ChevronRight, Tooltip, History, Code,
    FileCheck, Bug, Scale
} from 'lucide-react';
import { useSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { PROVIDER_SETTING_KEYS } from '@/lib/constants';
import { API_ROUTES, EXTERNAL_SERVICES } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type AdminTab = 'overview' | 'llmops' | 'dataops' | 'promptops' | 'devsecops' | 'settings' | 'observability' | 'evaluation';

const TABS: { id: AdminTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck, description: 'System health and quick stats' },
    { id: 'llmops', label: 'LLM Ops', icon: Cpu, description: 'Model performance and token usage' },
    { id: 'dataops', label: 'Data Ops', icon: Database, description: 'Vector store and ingestion' },
    { id: 'promptops', label: 'Prompt Ops', icon: FileText, description: 'Prompt registry and versions' },
    { id: 'devsecops', label: 'DevSecOps', icon: Shield, description: 'CI/CD and Security audits' },
    { id: 'settings', label: 'Global Config', icon: Sliders, description: 'Mutable system parameters' },
    { id: 'observability', label: 'Monitoring', icon: Activity, description: 'Metrics, Traces and Logs' },
    { id: 'evaluation', label: 'Evaluation', icon: Target, description: 'RAG quality and regressions' },
];

export default function AdminConsolePage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const { settings, updateSettings, isLoading: settingsLoading, refreshSettings } = useSettings();
    const { metadata, isLoading: metaLoading, error: metaError, refreshSettings: refreshMetadata } = useSettingsMetadata();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Operational Data State
    const [rawMetrics, setRawMetrics] = useState('');
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [vectorStatus, setVectorStatus] = useState<any>(null);
    const [promptsRegistry, setPromptsRegistry] = useState<any>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        setMetricsLoading(true);
        try {
            const [mRes, vRes, pRes] = await Promise.all([
                fetch(API_ROUTES.METRICS),
                fetch(API_ROUTES.ADMIN_VECTOR_STATUS),
                fetch(API_ROUTES.ADMIN_PROMPTS)
            ]);

            if (mRes.ok) setRawMetrics(await mRes.text());
            if (vRes.ok) {
                const vData = await vRes.json();
                setVectorStatus(vData.data);
            }
            if (pRes.ok) {
                const pData = await pRes.json();
                setPromptsRegistry(pData.data);
            }

            setLastSync(new Date());
            setMetricsError(null);
        } catch (e) {
            setMetricsError('Operational data sync failed.');
        } finally {
            setMetricsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const parseMetric = (name: string, labels?: Record<string, string>) => {
        let regexStr = `^${name}`;
        if (labels) {
            const labelStr = Object.entries(labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            regexStr += `\\{[^\\}]*${labelStr}[^\\}]*\\}`;
        }
        const regex = new RegExp(`${regexStr}\\s+([\\d\\.\\+e]+)`, 'm');
        const match = rawMetrics.match(regex);
        return match ? parseFloat(match[1]) : 0;
    };

    const handleSettingUpdate = async (key: string, value: string | number | boolean) => {
        setIsSaving(key);
        await updateSettings({ [key]: value });
        setTimeout(() => setIsSaving(null), 1000);
    };

    const isLoading = settingsLoading || metaLoading || metricsLoading;

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <header className="flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                <Terminal size={24} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter">Ops Center</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Internal Platform Engineering. ScienChan Operational Control Plane.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastSync && (
                            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Last Sync: {lastSync.toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => { refreshSettings(); refreshMetadata(); fetchData(); }}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                </header>

                {/* Domain Navigation */}
                <nav className="flex gap-2 bg-[#121214] rounded-2xl p-1.5 border border-white/5 overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl transition-all relative min-w-[120px]",
                                activeTab === tab.id
                                    ? "bg-white/5 text-white"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
                            )}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? "text-indigo-400" : ""} />
                            <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="active-nav-indicator"
                                    className="absolute -bottom-1 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Main Content Area */}
                <main className="relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                        >
                            {/* Head Content for Current Tab */}
                            <div className="pb-4 border-b border-white/5">
                                <h2 className="text-xl font-black tracking-tight">{TABS.find(t => t.id === activeTab)?.label}</h2>
                                <p className="text-sm text-gray-500 font-medium">{TABS.find(t => t.id === activeTab)?.description}</p>
                            </div>

                            {activeTab === 'overview' && <OverviewTab parseMetric={parseMetric} settings={settings} />}
                            {activeTab === 'llmops' && <LLMOpsTab parseMetric={parseMetric} settings={settings} />}
                            {activeTab === 'dataops' && <DataOpsTab vectorStatus={vectorStatus} parseMetric={parseMetric} />}
                            {activeTab === 'promptops' && <PromptOpsTab registry={promptsRegistry} />}
                            {activeTab === 'devsecops' && <DevSecOpsTab />}
                            {activeTab === 'settings' && <SettingsTab settings={settings} metadata={metadata} handleUpdate={handleSettingUpdate} isSaving={isSaving} />}
                            {activeTab === 'observability' && <ObservabilityTab rawMetrics={rawMetrics} metricsError={metricsError} />}
                            {activeTab === 'evaluation' && <EvaluationDashboard />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: OVERVIEW                                                              */
/* -------------------------------------------------------------------------- */
function OverviewTab({ parseMetric, settings }: any) {
    const cards = [
        { label: 'HTTP Requests', value: parseMetric('http_requests_total').toLocaleString(), sub: 'Total (lifetime)', icon: Zap, color: 'text-blue-400' },
        { label: 'Active Streams', value: parseMetric('active_chat_streams'), sub: 'Current live users', icon: Users, color: 'text-emerald-400' },
        { label: 'Ingestion Count', value: parseMetric('document_ingestions_total').toLocaleString(), sub: 'Processed fragments', icon: Database, color: 'text-amber-400' },
        { label: 'Error Rate', value: `${((parseMetric('http_errors_total') / (parseMetric('http_requests_total') || 1)) * 100).toFixed(2)}%`, sub: 'Service reliability', icon: AlertTriangle, color: 'text-red-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <div key={card.label} className="bg-[#121214] border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-all flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</div>
                            <div className="text-2xl font-black">{card.value}</div>
                            <div className="text-[10px] text-gray-600 font-bold mt-1">{card.sub}</div>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-white/5", card.color)}>
                            <card.icon size={20} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-4 -translate-y-4">
                        <ShieldCheck size={180} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Package size={16} className="text-indigo-400" />
                        Infrastructure Manifest
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Deployment Strategy', value: 'Rolling Update / Canary Ready', status: 'Healthy' },
                            { label: 'Security Enforcement', value: 'Checkov High/Critical Pass', status: 'Standard' },
                            { label: 'RAG Pipeline', value: 'Hybrid (Vector + Keyword) + RRF', status: 'Active' },
                            { label: 'Vault Storage', value: 'MinIO (S3) Versioned', status: 'Versioned' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-bold">{item.label}</div>
                                    <div className="text-tiny font-black text-white">{item.value}</div>
                                </div>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{item.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2">
                        <BarChart4 size={16} className="text-purple-400" />
                        Runtime Environment
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'LLM Model', value: settings?.llm_model || '...' },
                            { label: 'Embedding', value: settings?.embedding_model || '...' },
                            { label: 'Vector Store', value: 'Qdrant (Async)' },
                            { label: 'Metadata DB', value: 'MongoDB (Async)' },
                            { label: 'Telemetry', value: 'OpenTelemetry (gRPC)' },
                            { label: 'Metrics', value: 'Prometheus (Scraped)' },
                        ].map((item) => (
                            <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                                <span className="text-[9px] text-gray-600 font-black uppercase tracking-wider">{item.label}</span>
                                <span className="text-tiny font-bold text-white truncate">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: LLM OPS                                                               */
/* -------------------------------------------------------------------------- */
function LLMOpsTab({ parseMetric, settings }: any) {
    const providers = ['OpenAI', 'Anthropic', 'Ollama', 'Groq'];

    return (
        <div className="space-y-8">
            {/* Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider uppercase mb-5 flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        P50 Latency (Sec)
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Retrieval', metric: 'rag_retrieval_duration_seconds_sum', count: 'rag_retrieval_duration_seconds_count', color: 'bg-blue-500' },
                            { label: 'Embedding', metric: 'embedding_request_duration_seconds_sum', count: 'embedding_request_duration_seconds_count', color: 'bg-indigo-500' },
                            { label: 'Generation', metric: 'llm_request_duration_seconds_sum', count: 'llm_request_duration_seconds_count', color: 'bg-purple-500' },
                        ].map((m) => {
                            const sum = parseMetric(m.metric);
                            const count = parseMetric(m.count) || 1;
                            const avg = sum / count;
                            return (
                                <div key={m.label} className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-black uppercase">
                                        <span className="text-gray-500">{m.label}</span>
                                        <span className="text-white">{avg.toFixed(3)}s</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((avg / 2) * 100, 100)}%` }}
                                            className={cn("h-full", m.color)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            Token Allocation & Cost
                        </h3>
                        <div className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Real-time from Instrumentation
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Prompt Tokens', value: parseMetric('llm_tokens_total', { token_type: 'prompt' }), color: 'text-indigo-400' },
                            { label: 'Completion Tokens', value: parseMetric('llm_tokens_total', { token_type: 'completion' }), color: 'text-emerald-400' },
                            { label: 'Total Used', value: parseMetric('llm_tokens_total'), color: 'text-white' },
                            { label: 'Est. Cost', value: `$${(parseMetric('llm_tokens_total') * 0.00001).toFixed(4)}`, color: 'text-amber-400' },
                        ].map((stat) => (
                            <div key={stat.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">{stat.label}</div>
                                <div className={cn("text-xl font-black", stat.color)}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <Cpu size={20} className="text-indigo-400" />
                            <div>
                                <div className="text-tiny font-black text-white uppercase">Primary Delivery Model</div>
                                <div className="text-[11px] font-bold text-indigo-300/60">{settings?.llm_model || 'Loading...'}</div>
                            </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-indigo-500 text-black font-black text-[10px] uppercase hover:bg-indigo-400 transition-all">
                            Configure Routing
                        </button>
                    </div>
                </div>
            </div>

            {/* Provider Breakdown */}
            <div className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">AI Provider</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Requests</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Avg Latency</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Errors</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {providers.map((p) => {
                            const requests = parseMetric('llm_requests_total', { provider: p.toLowerCase() });
                            const errors = parseMetric('llm_requests_total', { provider: p.toLowerCase(), status: 'error' });
                            return (
                                <tr key={p} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4 font-black text-sm text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                                            <Server size={14} />
                                        </div>
                                        {p}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400">{requests.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                                        {(parseMetric('llm_request_duration_seconds_sum', { provider: p.toLowerCase() }) / (requests || 1)).toFixed(2)}s
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn("px-2 py-0.5 rounded font-black text-[9px]", errors > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-500")}>
                                            {errors} Errors
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", requests > (i * 10) ? "bg-emerald-500" : "bg-white/10")} />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: DATA OPS                                                              */
/* -------------------------------------------------------------------------- */
function DataOpsTab({ vectorStatus, parseMetric }: any) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Qdrant Status */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                                <HardDrive size={16} className="text-amber-400" />
                                Vector Collections
                            </h3>
                            <div className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2">
                                Host: <span className="text-white">{vectorStatus?.host}:{vectorStatus?.port}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {vectorStatus?.collections?.map((c: any) => (
                                <div key={c.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <div className="text-tiny font-black text-white">{c.name}</div>
                                            <div className="text-[10px] text-gray-600 font-bold">
                                                {c.config.vector_size} Dim • {c.config.distance} • {c.segments_count} Segments
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-tiny font-black text-white">{(c.points_count / 1000).toFixed(1)}K Points</div>
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase">{c.status}</span>
                                    </div>
                                </div>
                            ))}
                            {!vectorStatus?.collections?.length && (
                                <div className="p-12 text-center text-gray-600 font-bold border border-dashed border-white/5 rounded-xl">
                                    No active vector collections detected.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Vault Replication</div>
                            <div className="text-xl font-black">S3 Versioning Enabled</div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-emerald-500/70 font-bold uppercase">Consistency: Strong</span>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Index Fragmentation</div>
                            <div className="text-xl font-black">0.82%</div>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                                <div className="h-full w-[82%] bg-amber-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ingestion Pipeline */}
                <div className="space-y-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black tracking-wider uppercase mb-5 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-400" />
                            Ingestion Pipeline
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: '.PDF Processing', count: parseMetric('document_ingestions_total', { extension: '.pdf' }), color: 'text-red-400' },
                                { label: '.TXT / .MD Raw', count: parseMetric('document_ingestions_total', { extension: '.txt' }), color: 'text-blue-400' },
                                { label: '.DOCX Office', count: parseMetric('document_ingestions_total', { extension: '.docx' }), color: 'text-indigo-400' },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <div className="text-[11px] font-black text-white">{row.label}</div>
                                        <div className="text-[9px] text-gray-600 font-bold">Latency: 1.2s avg</div>
                                    </div>
                                    <div className={cn("text-tiny font-black", row.color)}>{row.count.toLocaleString()} Docs</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-600/5 border border-amber-500/10">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={18} className="text-amber-400" />
                            <span className="text-tiny font-black text-amber-100 uppercase">Ops Guardrail</span>
                        </div>
                        <p className="text-[10px] text-amber-200/50 leading-relaxed font-medium">
                            Bulk re-indexing across multi-collections consumes intensive I/O. Schedule after hours or use canary collections.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: PROMPT OPS                                                            */
/* -------------------------------------------------------------------------- */
function PromptOpsTab({ registry }: any) {
    // Flatten registry to handle nested structures like evaluator.faithfulness
    const flattenedRegistry = React.useMemo(() => {
        if (!registry) return null;
        console.log('[PromptOps] Processing Registry:', registry);
        const flat: any = {};
        try {
            Object.entries(registry).forEach(([domain, versions]: [string, any]) => {
                if (!versions || typeof versions !== 'object') return;

                const firstKey = Object.keys(versions)[0];
                if (firstKey && !firstKey.startsWith('v') && typeof versions[firstKey] === 'object') {
                    // Nested structure (e.g. evaluator.faithfulness)
                    Object.entries(versions).forEach(([sub, subVers]: [string, any]) => {
                        flat[`${domain}.${sub}`] = subVers;
                    });
                } else {
                    flat[domain] = versions;
                }
            });
        } catch (err) {
            console.error('[PromptOps] Flattening failed:', err);
        }
        return flat;
    }, [registry]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {flattenedRegistry ? Object.entries(flattenedRegistry).map(([domain, versions]: [any, any]) => (
                    <div key={domain} className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                                <Code size={16} className="text-indigo-400" />
                                {String(domain).replace('_', ' ').replace('.', ' → ')}
                            </h3>
                            <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                                {Object.keys(versions || {}).length} Versions
                            </span>
                        </div>

                        <div className="space-y-2">
                            {versions && typeof versions === 'object' ? Object.entries(versions).map(([v, content]: [any, any]) => {
                                // Get a preview string safely
                                let preview = '';
                                if (typeof content === 'string') {
                                    preview = content;
                                } else if (content && typeof content === 'object') {
                                    preview = content.description || content.system || content.user || content.create || content.text || '';
                                    if (typeof preview !== 'string') {
                                        // Fallback to first string value found
                                        const firstStr = Object.values(content).find(val => typeof val === 'string');
                                        preview = (firstStr as string) || JSON.stringify(content);
                                    }
                                }

                                return (
                                    <div key={v} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-tiny font-black text-indigo-400">{String(v)}</span>
                                            <div className="flex gap-2">
                                                {v === 'v1' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase border border-emerald-500/20">Production</span>}
                                                <button className="p-1 rounded text-gray-600 hover:text-white transition-colors"><ChevronRight size={14} /></button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                                            {typeof preview === 'string' ? preview : JSON.stringify(preview)}
                                        </p>
                                    </div>
                                );
                            }) : null}
                        </div>
                    </div>
                )) : (
                    <div className="lg:col-span-2 flex items-center justify-center p-20 border border-dashed border-white/5 rounded-3xl">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <div className="text-tiny font-black text-gray-600 uppercase tracking-widest">Loading Prompt Registry Manifest...</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <History size={24} />
                </div>
                <div className="max-w-md">
                    <h3 className="text-tiny font-black uppercase tracking-wider text-indigo-100">Hot-Reload & Rollback</h3>
                    <p className="text-[11px] text-indigo-300/60 font-medium leading-relaxed mt-1">
                        Prompt versions are defined in Git but managed as code. Version mismatches during canary deploys are detected via regression evaluation.
                    </p>
                </div>
                <button className="px-6 py-2.5 rounded-xl bg-indigo-500 text-black font-black text-[11px] uppercase hover:bg-indigo-400 transition-all">
                    Initialize A/B Experiment
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: DEVSEC OPS                                                            */
/* -------------------------------------------------------------------------- */
function DevSecOpsTab() {
    const pipelines = [
        { name: 'Backend-CI', status: 'success', lastRun: '2h ago', duration: '4m 12s', audit: 'Passed' },
        { name: 'Frontend-CI', status: 'success', lastRun: '5h ago', duration: '3m 45s', audit: 'Passed' },
        { name: 'Prompt-Regressions', status: 'warning', lastRun: '1d ago', duration: '12m 30s', audit: 'Failed 2/40' },
        { name: 'Infra-Scanning', status: 'success', lastRun: '12h ago', duration: '45s', audit: 'Clean' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider uppercase mb-6 flex items-center gap-2">
                        <Package size={16} className="text-blue-400" />
                        CI/CD Execution (Jenkins)
                    </h3>
                    <div className="space-y-3">
                        {pipelines.map(pipe => (
                            <div key={pipe.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        pipe.status === 'success' ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <div>
                                        <div className="text-tiny font-black text-white">{pipe.name}</div>
                                        <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{pipe.lastRun} • {pipe.duration}</div>
                                    </div>
                                </div>
                                <button className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-all"><ExternalLink size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                            <Shield size={16} className="text-red-400" />
                            Security Posture (Checkov/Sonar)
                        </h3>
                        <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 uppercase tracking-widest">Compliant</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-red-400">
                                <Bug size={14} />
                                <span className="text-[10px] font-black uppercase">Technical Debt</span>
                            </div>
                            <div className="text-2xl font-black">2.4%</div>
                            <div className="text-[9px] text-gray-600 font-medium">B Grade on SonarQube</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <FileCheck size={14} />
                                <span className="text-[10px] font-black uppercase">IaC Audit</span>
                            </div>
                            <div className="text-2xl font-black">Clean</div>
                            <div className="text-[9px] text-gray-600 font-medium">Zero High CVEs in Docker</div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-[9px]">Pipeline Compliance</span>
                            <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg bg-white/5">98.2%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-[98.2%] bg-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <GitBranch size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white">Production Promotion Control</h4>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">Manual approval required for environment promotion when quality gate fails.</p>
                    </div>
                </div>
                <div className="flex gap-3 text-[10px] font-black uppercase">
                    <button className="px-5 py-2.5 rounded-xl border border-white/5 text-gray-500 cursor-not-allowed">Rollback Cluster</button>
                    <button className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 transition-all">Promote Release</button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TAB: SETTINGS & MONITORING (REUSING COMPONENTS FROM AUDITED FILE)          */
/* -------------------------------------------------------------------------- */

function SettingsTab({ settings, metadata, handleUpdate, isSaving }: any) {
    if (!settings || !metadata) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" /></div>;

    const providerFields = providerFieldsList();
    const otherFields = Object.keys(settings).filter(k => !PROVIDER_SETTING_KEYS.includes(k));

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Providers Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 px-2">
                        <Cpu size={16} className="text-indigo-400" />
                        AI Provider Matrix
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {providerFields.map(field => (
                            <ConfigField key={field.key} field={field} settings={settings} metadata={metadata} handleUpdate={handleUpdate} isSaving={isSaving} />
                        ))}
                    </div>
                </div>

                {/* Other Config Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 px-2">
                        <Scale size={16} className="text-amber-400" />
                        Heuristic Controls
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {otherFields.map(key => (
                            <ConfigField key={key} field={{ key, label: key.replace(/_/g, ' '), type: typeof settings[key] === 'boolean' ? 'bool' : 'text' }} settings={settings} metadata={metadata} handleUpdate={handleUpdate} isSaving={isSaving} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigField({ field, settings, metadata, handleUpdate, isSaving }: any) {
    const meta = metadata[field.key];
    const value = settings[field.key];
    const isBool = field.type === 'bool' || typeof value === 'boolean';
    const isNum = typeof value === 'number';

    return (
        <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                    <span className="text-tiny font-black text-white capitalize">{field.label}</span>
                    {meta && !meta.mutable && <span className="text-[9px] font-black text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Immutable</span>}
                </div>
                <p className="text-[10px] text-gray-600 font-bold truncate mt-0.5">{meta?.description || 'Operational system parameter.'}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                {isBool ? (
                    <button
                        onClick={() => handleUpdate(field.key, !value)}
                        disabled={!meta?.mutable}
                        className={cn("w-10 h-5 rounded-full p-0.5 transition-all relative", value ? "bg-indigo-600" : "bg-white/10")}
                    >
                        <motion.div animate={{ x: value ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow" />
                    </button>
                ) : field.type === 'select' && meta?.options ? (
                    <select
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-tiny font-bold text-white focus:outline-none min-w-[140px]"
                        value={String(value)}
                        onChange={(e) => handleUpdate(field.key, e.target.value)}
                        disabled={!meta?.mutable}
                    >
                        {meta.options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input
                        type={isNum ? "number" : "text"}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-tiny font-bold text-white focus:ring-1 ring-indigo-500/30 w-32 outline-none"
                        defaultValue={String(value)}
                        onBlur={(e) => {
                            const v = isNum ? parseFloat(e.target.value) : e.target.value;
                            if (v !== value) handleUpdate(field.key, v);
                        }}
                        disabled={!meta?.mutable}
                    />
                )}
                <div className="w-4 flex justify-center">
                    {isSaving === field.key && <Loader2 size={12} className="text-indigo-400 animate-spin" />}
                </div>
            </div>
        </div>
    );
}

function ObservabilityTab({ rawMetrics, metricsError }: any) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-8 space-y-10">
                    <div className="space-y-2">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter">Distributed Tracing</h3>
                        <p className="text-sm text-gray-500 font-medium">Deep inspection of RAG pipeline spans and agent lifecycle via gRPC Jaeger exporter.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                            <span className="text-[10px] text-gray-600 font-black uppercase">Service ID</span>
                            <span className="text-tiny font-bold text-white">scienchan-backend</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                            <span className="text-[10px] text-gray-600 font-black uppercase">Collector</span>
                            <span className="text-tiny font-bold text-white">Jaeger (OTLP)</span>
                        </div>
                    </div>

                    <a
                        href={EXTERNAL_SERVICES.JAEGER}
                        target="_blank"
                        rel="noreferrer"
                        className="group w-full py-4 rounded-2xl bg-amber-500 text-black font-black flex items-center justify-center gap-3 hover:bg-amber-400 transition-all"
                    >
                        Launch Trace Explorer <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-emerald-400" />
                                <h3 className="text-sm font-black uppercase tracking-wider">Prometheus Scrape</h3>
                            </div>
                            <span className="text-[9px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase">Export Mode</span>
                        </div>
                        <div className="relative flex-1 bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                            <pre className="p-4 text-[10px] font-mono text-gray-600 overflow-y-auto absolute inset-0 custom-scrollbar leading-relaxed">
                                {metricsError || rawMetrics || 'TELEMETRY_INITIALIZING...'}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function providerFieldsList() {
    return [
        { key: 'llm_provider', label: 'LLM Provider', type: 'select' },
        { key: 'llm_model', label: 'Inference Model', type: 'text' },
        { key: 'embedding_provider', label: 'Embedding Provider', type: 'select' },
        { key: 'embedding_model', label: 'Embedding Model', type: 'text' },
    ];
}

/* -------------------------------------------------------------------------- */
/* TAB: EVALUATION (ORIGINAL REFINED)                                         */
/* -------------------------------------------------------------------------- */
function EvaluationDashboard() {
    const [datasets, setDatasets] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [dsRes, runsRes] = await Promise.all([
                fetch(API_ROUTES.EVAL_DATASETS),
                fetch(API_ROUTES.EVAL_RUNS)
            ]);
            if (dsRes.ok) {
                const dsData = await dsRes.json();
                setDatasets(dsData.data || []);
            }
            if (runsRes.ok) {
                const runsData = await runsRes.json();
                setRuns(runsData.data || []);
            }
        } catch (error) {
            console.error("Eval fetch failed", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const runEval = async (datasetId: string) => {
        setIsRunning(datasetId);
        try {
            const res = await fetch(API_ROUTES.EVAL_RUNS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset_id: datasetId })
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error("Eval run failed", error);
        } finally {
            setIsRunning(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Database size={16} className="text-indigo-400" />
                    Eval Datasets
                </h3>
                <div className="space-y-3">
                    {datasets.map((ds) => (
                        <div key={ds.id} className="p-4 rounded-2xl bg-[#121214] border border-white/5">
                            <h4 className="text-tiny font-black text-white mb-2">{ds.name}</h4>
                            <div className="flex justify-between text-[10px] text-gray-500 font-bold mb-4">
                                <span>{ds.test_cases?.length || 0} Test Cases</span>
                                <span className="text-indigo-400 uppercase">{ds.workspace_id}</span>
                            </div>
                            <button
                                onClick={() => runEval(ds.id)}
                                disabled={isRunning === ds.id}
                                className="w-full py-2.5 rounded-xl bg-indigo-500 text-black font-black text-[10px] uppercase hover:bg-indigo-400 transition-all disabled:opacity-50"
                            >
                                {isRunning === ds.id ? <Loader2 size={12} className="animate-spin" /> : 'Run Evaluation'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <History size={16} className="text-emerald-400" />
                    Regressions & History
                </h3>
                <div className="space-y-4">
                    {runs.map((run) => (
                        <div key={run.id} className="p-6 rounded-2xl bg-[#121214] border border-white/5 hover:border-white/10 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        run.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" :
                                            run.status === 'running' ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {run.status === 'completed' ? <CheckCircle2 size={18} /> :
                                            run.status === 'running' ? <Loader2 size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white tracking-tight">Run ID: {run.id.slice(0, 8)}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{new Date(run.started_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {run.overall_metrics && Object.entries(run.overall_metrics).map(([k, v]: [any, any]) => (
                                        <div key={k} className="text-right">
                                            <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{k.replace('_', ' ')}</div>
                                            <div className="text-sm font-black text-white">{Number(v).toFixed(2)}</div>
                                        </div>
                                    ))}
                                    <ChevronRight size={18} className="text-gray-700 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: run.status === 'completed' ? '100%' : '30%' }} className={cn("h-full", run.status === 'completed' ? "bg-emerald-500" : "bg-blue-500")} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
