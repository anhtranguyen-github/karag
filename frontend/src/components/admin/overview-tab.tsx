import React from 'react';
import { Database, AlertTriangle, Package, ShieldCheck, BarChart4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Zap, Users } from 'lucide-react';
import { AppSettings } from '@/hooks/use-settings';

interface OverviewTabProps {
    parseMetric: (name: string, labels?: Record<string, string>) => number;
    settings: AppSettings | null;
}

export function OverviewTab({ parseMetric, settings }: OverviewTabProps) {
    const cards = [
        { label: 'HTTP Requests', value: parseMetric('http_requests_total').toLocaleString(), sub: 'Total (lifetime)', icon: Zap, color: 'text-blue-400' },
        { label: 'Active Streams', value: parseMetric('active_chat_streams'), sub: 'Current live users', icon: Users, color: 'text-emerald-400' },
        { label: 'Ingestion Count', value: parseMetric('document_ingestions_total').toLocaleString(), sub: 'Processed fragments', icon: Database, color: 'text-amber-400' },
        { label: 'Error Rate', value: `${((parseMetric('http_errors_total') / (parseMetric('http_requests_total') || 1)) * 100).toFixed(2)}%`, sub: 'Service reliability', icon: AlertTriangle, color: 'text-red-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="bg-[#121214] border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-all flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black text-gray-500 tracking-widest mb-1">{card.label}</div>
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
                    <h3 className="text-sm font-black tracking-wider mb-6 flex items-center gap-2">
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
                    <h3 className="text-sm font-black tracking-wider mb-6 flex items-center gap-2">
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
                                <span className="text-[9px] text-gray-600 font-black tracking-wider">{item.label}</span>
                                <span className="text-tiny font-bold text-white truncate">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
