'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Loader2, RefreshCw, Server, Users, Zap, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ROUTES } from '@/lib/api-config';

export default function MetricsPage() {
    const [rawMetrics, setRawMetrics] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchMetrics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_ROUTES.METRICS);
            if (res.ok) {
                const text = await res.text();
                setRawMetrics(text);
                setError(null);
                setLastUpdated(new Date());
            } else {
                setError('Prometheus metrics endpoint is unreachable or disabled.');
            }
        } catch (err) {
            setError('Connection failed. Ensure the backend is running with METRICS_ENABLED=true.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 10000);
        return () => clearInterval(interval);
    }, []);

    // Simple partial parser for visualization
    const parseMetricValue = (name: string) => {
        const regex = new RegExp(`^${name}(?:\\{[^\\}]*\\})?\\s+([\\d\\.]+)`, 'm');
        const match = rawMetrics.match(regex);
        return match ? parseFloat(match[1]) : 0;
    };

    const dashboardMetrics = [
        { label: 'Total Requests', value: parseMetricValue('http_requests_total'), icon: Zap, color: 'text-blue-400' },
        { label: 'Active Streams', value: parseMetricValue('active_chat_streams'), icon: Users, color: 'text-emerald-400' },
        { label: 'System Errors', value: parseMetricValue('http_errors_total'), icon: AlertTriangle, color: 'text-red-400' },
        { label: 'Vector Store Ops', value: parseMetricValue('vector_store_operation_duration_seconds_count'), icon: Server, color: 'text-amber-400' },
    ];

    return (
        <div className="p-10 max-w-6xl mx-auto space-y-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 font-black uppercase tracking-tighter mb-2">System Metrics</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-caption text-gray-500 max-w-xl">
                            Real-time telemetry from the Prometheus exporter. Monitoring the four golden signals of the neural fabric.
                        </p>
                        {lastUpdated && (
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                Last Sync: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => fetchMetrics()}
                    disabled={isLoading}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
            </header>

            {error ? (
                <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-h3 font-black text-white uppercase">Observability Offline</h3>
                    <p className="text-caption text-gray-500 max-w-md">{error}</p>
                    <button
                        onClick={() => fetchMetrics()}
                        className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-tiny font-bold uppercase text-white hover:bg-white/10 transition-all"
                    >
                        Retry Sync
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {dashboardMetrics.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex items-center gap-6"
                            >
                                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <div className="text-tiny font-black text-gray-500 uppercase tracking-widest">{stat.label}</div>
                                    <div className="text-h2 font-black text-white">{stat.value.toLocaleString()}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-h3 font-black uppercase tracking-tighter">Raw Exporter Data</h3>
                            <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                Live Feed
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#121214] pointer-events-none" />
                            <pre className="text-[10px] text-gray-600 font-mono overflow-y-auto max-h-[400px] custom-scrollbar p-6 bg-black/20 rounded-2xl border border-white/5 leading-relaxed">
                                {rawMetrics || 'Initializing telemetry stream...'}
                            </pre>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
