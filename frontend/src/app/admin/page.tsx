'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Cpu,
    Database,
    Activity,
    Zap,
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const STATS = [
    { label: 'AI Providers', value: '4 Active', icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/admin/providers' },
    { label: 'Global Settings', value: '24 Param', icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10', href: '/admin/settings' },
    { label: 'System Metrics', value: 'Healthy', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/admin/metrics' },
    { label: 'Trace Spans', value: '1.2k/hr', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/admin/traces' },
];

export default function AdminOverview() {
    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10">
            <header>
                <h1 className="text-h1 font-black uppercase tracking-tighter mb-2">System Control</h1>
                <p className="text-caption text-gray-500 max-w-2xl">
                    Centralized orchestration for ScienChan's neural fabric. Monitor performance, configure providers, and audit system traces.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STATS.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4 group hover:border-white/10 transition-all"
                    >
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-tiny font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className="text-h3 font-black text-white">{stat.value}</div>
                        </div>
                        <Link
                            href={stat.href}
                            className="mt-2 flex items-center gap-2 text-tiny font-bold uppercase text-gray-600 group-hover:text-white transition-colors"
                        >
                            Configure <ArrowRight size={12} />
                        </Link>
                    </motion.div>
                ))}
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={240} />
                    </div>

                    <h3 className="text-h3 font-black uppercase tracking-tighter mb-6">Security & Orchestration</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                            <div>
                                <div className="text-caption font-bold text-white mb-1">RBAC Isolation Active</div>
                                <p className="text-tiny text-gray-500">Workspace-level data isolation is enforced at the kernel level. No cross-tenant leakage detected.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                            <div>
                                <div className="text-caption font-bold text-white mb-1">Provider Failover Ready</div>
                                <p className="text-tiny text-gray-500">Secondary embedding providers are configured. System will fallback automatically if primary latency exceeds 5s.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform group-hover:rotate-12 transition-transform">
                        <Zap size={120} />
                    </div>
                    <h3 className="text-h3 font-black uppercase tracking-tighter mb-4">Enterprise Hub</h3>
                    <p className="text-caption font-medium text-indigo-100 mb-8 leading-relaxed">
                        Scale your intelligence fabric with dedicated resources and priority inference.
                    </p>
                    <button className="w-full py-4 rounded-2xl bg-white text-indigo-600 font-black uppercase tracking-widest text-tiny hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/40">
                        Upgrade Deployment
                    </button>
                </div>
            </section>
        </div>
    );
}
