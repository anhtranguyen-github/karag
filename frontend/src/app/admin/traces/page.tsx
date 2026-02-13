'use client';

import React from 'react';
import { Zap, ExternalLink, Shield, Info, Activity, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { EXTERNAL_SERVICES } from '@/lib/api-config';

export default function TracesPage() {
    const JAEGER_URL = EXTERNAL_SERVICES.JAEGER;

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-10">
            <header>
                <h1 className="text-h1 font-black uppercase tracking-tighter mb-2">Distributed Tracing</h1>
                <p className="text-caption text-gray-500 max-w-2xl">
                    Inspect the lifecycle of every request across the neural fabric. Visualize pipeline latency and bottleneck identification via OpenTelemetry.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform">
                            <Layers size={200} />
                        </div>

                        <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <Zap size={32} />
                        </div>

                        <div>
                            <h3 className="text-h3 font-black uppercase tracking-tighter mb-4">Jaeger Intelligence</h3>
                            <p className="text-caption text-gray-400 leading-relaxed mb-6">
                                The system is instrumented with OTEL spans. For deep analysis, use the Jaeger query console to inspect the complete trace graph of RAG operations, document ingestion, and LLM inference.
                            </p>

                            <a
                                href={JAEGER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-tiny hover:bg-amber-400 transition-all shadow-xl shadow-amber-900/20"
                            >
                                Open Jaeger Console <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] space-y-2">
                            <div className="text-tiny font-black text-gray-500 uppercase tracking-widest">OTEL Service</div>
                            <div className="text-caption font-bold text-white uppercase">scienchan-backend</div>
                        </div>
                        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] space-y-2">
                            <div className="text-tiny font-black text-gray-500 uppercase tracking-widest">Sample Rate</div>
                            <div className="text-caption font-bold text-white uppercase">100% (Debug)</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center gap-3 text-emerald-500">
                            <Shield size={18} />
                            <span className="text-tiny font-black uppercase tracking-widest">Health Sync</span>
                        </div>
                        <p className="text-tiny text-gray-500 font-medium leading-relaxed">
                            Telemetry instrumentation is embedded in the kernel. Spans are asynchronously exported to the OTLP collector.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center gap-3 text-blue-500">
                            <Activity size={18} />
                            <span className="text-tiny font-black uppercase tracking-widest">Latency Focus</span>
                        </div>
                        <p className="text-tiny text-gray-500 font-medium leading-relaxed">
                            Automatic detection of p99 outliers in retrieval and embedding stages.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Info size={24} />
                </div>
                <div>
                    <h4 className="text-caption font-bold text-amber-400 mb-2">Developer Note</h4>
                    <p className="text-tiny text-amber-300/60 leading-relaxed font-bold uppercase tracking-widest">
                        If the Jaeger console does not load, ensure the collector container is active and `OTEL_ENABLED` is set to `true` in your backend configuration.
                    </p>
                </div>
            </div>
        </div>
    );
}
