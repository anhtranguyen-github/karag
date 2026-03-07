'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Database, Activity, ShieldCheck, RefreshCw, Sliders,
    Target, Terminal, Shield, FileText, Search, BrainCircuit
} from 'lucide-react';
import { useSettings, useSettingsMetadata } from '@/hooks/use-settings';
import { admin } from '@/sdk/admin';
import { cn } from '@/lib/utils';
import { OverviewTab } from '@/components/admin/overview-tab';
import { LLMOpsTab } from '@/components/admin/llmops-tab';
import { DataOpsTab, VectorStatus } from '@/components/admin/dataops-tab';
import { RetrievalBoard } from '@/components/admin/retrieval-board';
import { AgentBoard } from '@/components/admin/agent-board';
import { PromptOpsTab, PromptRegistry } from '@/components/admin/promptops-tab';
import { DevSecOpsTab } from '@/components/admin/devsecops-tab';
import { SettingsTab } from '@/components/admin/settings-tab';
import { ObservabilityTab } from '@/components/admin/observability-tab';
import { EvaluationDashboard } from '@/components/admin/evaluation-dashboard';
import { DeploymentTab } from '@/components/admin/deployment-tab';

type AdminTab = 'overview' | 'llmops' | 'retrieval' | 'agentic' | 'dataops' | 'promptops' | 'devsecops' | 'deployment' | 'settings' | 'observability' | 'evaluation';

const TABS: { id: AdminTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck, description: 'System health and quick stats' },
    { id: 'llmops', label: 'Model Usage', icon: Cpu, description: 'Generation metrics and token usage' },
    { id: 'retrieval', label: 'Search', icon: Search, description: 'Search performance and retrieval settings' },
    { id: 'agentic', label: 'Tool Use', icon: BrainCircuit, description: 'Tool execution and multi-step runs' },
    { id: 'dataops', label: 'Storage', icon: Database, description: 'Vector storage and document processing' },
    { id: 'promptops', label: 'Prompts', icon: FileText, description: 'Prompt library and version history' },
    { id: 'devsecops', label: 'Release Checks', icon: Shield, description: 'Build, deploy and security status' },
    { id: 'deployment', label: 'Deployment', icon: Database, description: 'Provider credentials, service bootstrap and setup checks' },
    { id: 'observability', label: 'Observability', icon: Activity, description: 'Logs, metrics and traces' },
    { id: 'evaluation', label: 'Evaluation', icon: Target, description: 'Answer quality and regression checks' },
    { id: 'settings', label: 'Global Config', icon: Sliders, description: 'Low-level system parameters' },
];

export default function AdminConsolePage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const { settings, updateSettings, refreshSettings } = useSettings();
    const { metadata, refreshSettings: refreshMetadata } = useSettingsMetadata();
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Metrics state
    const [rawMetrics, setRawMetrics] = useState('');
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [vectorStatus, setVectorStatus] = useState<VectorStatus | null>(null);
    const [promptsRegistry, setPromptsRegistry] = useState<PromptRegistry | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [overview, vectorStat, prompts] = (await Promise.all([
                admin.getOpsOverview(),
                admin.getVectorStatus(),
                admin.getPrompts()
            ])) as any[];

            // Handling raw metrics (if overview returns prometheus-style text or a payload containing it)
            // Note: If the new API returns a structured object, we might need to adjust parseMetric
            if (typeof overview === 'string') {
                setRawMetrics(overview);
            } else if (overview?.data?.metrics) {
                setRawMetrics(overview.data.metrics);
            }

            if (vectorStat) setVectorStatus(vectorStat.data || vectorStat);
            if (prompts) setPromptsRegistry(prompts.data || prompts);

            setLastSync(new Date());
            setMetricsError(null);
        } catch (err) {
            console.error('Metrics sync failed:', err);
            setMetricsError('Metrics sync failed.');
        } finally {
            // Loading state removed
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

    // isLoading logic removed as it's not being leveraged in the UI currently

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
                            <h1 className="text-3xl font-black tracking-tighter">Admin Console</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Configure services, monitor system health, and manage deployment settings.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastSync && (
                            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-gray-400 tracking-widest">
                                    last sync: {lastSync.toLocaleTimeString()}
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
                            <span className="text-[11px] font-black tracking-wider">{tab.label}</span>
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
                            {activeTab === 'retrieval' && <RetrievalBoard parseMetric={parseMetric} settings={settings} />}
                            {activeTab === 'agentic' && <AgentBoard parseMetric={parseMetric} settings={settings} />}
                            {activeTab === 'dataops' && <DataOpsTab vectorStatus={vectorStatus} parseMetric={parseMetric} />}
                            {activeTab === 'promptops' && <PromptOpsTab registry={promptsRegistry} />}
                            {activeTab === 'devsecops' && <DevSecOpsTab />}
                            {activeTab === 'deployment' && <DeploymentTab />}
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




