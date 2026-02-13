'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SettingsManager } from '@/components/settings-manager';
import { Wrench, Shield, Globe, Cpu, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { cn } from '@/lib/utils';

export default function KernelPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { workspaces } = useWorkspaces();
    const currentWorkspace = workspaces.find(w => w.id === workspaceId);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                        <Wrench size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight ">System Kernel</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-tiny text-gray-500 font-bold  ">Architect Configuration • {currentWorkspace?.name || workspaceId}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                        <Shield size={14} className="text-amber-500" />
                        <span className="text-tiny font-black text-gray-600 ">Core Lockdown Active</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Diagnostic Cluster */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Neural Throughput', value: '48.2 TK/S', icon: Activity, color: 'text-indigo-400' },
                            { label: 'Memory Pressure', value: '1.2 GB', icon: Cpu, color: 'text-blue-400' },
                            { label: 'Encryption Latency', value: '0.4 MS', icon: Shield, color: 'text-green-400' },
                            { label: 'Network Relay', value: 'STABLE', icon: Globe, color: 'text-purple-400' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-[#121214] border border-white/5 p-5 rounded-3xl flex flex-col gap-3 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <stat.icon size={48} />
                                </div>
                                <div className="text-tiny font-black text-gray-600   leading-none">{stat.label}</div>
                                <div className={cn("text-h3 font-black  leading-none", stat.color)}>{stat.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main UI */}
                    <div className="bg-[#121214] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden h-[800px] flex flex-col">
                        <div className="p-10 border-b border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent">
                            <h3 className="text-h2 font-black   mb-2">Core Parameters</h3>
                            <p className="text-gray-500 text-caption font-medium leading-relaxed max-w-xl">
                                Fine-tune the underlying LLM behavior, embedding strategies, and interface preferences. These changes apply to the <span className="text-white">current workspace context</span>.
                            </p>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <SettingsManager workspaceId={workspaceId} workspaceName={currentWorkspace?.name} />
                        </div>
                    </div>

                    {/* Global Meta */}
                    <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between pb-20">
                        <div className="flex items-center gap-4">
                            <Zap size={24} className="text-indigo-500" />
                            <div>
                                <h4 className="text-caption font-black  tracking-tight text-white">Global Manifest Controls</h4>
                                <p className="text-tiny text-indigo-400/60 font-medium">Access system-wide account and subscription nodes.</p>
                            </div>
                        </div>
                        <Link
                            href="/admin"
                            className="px-6 py-3 rounded-xl bg-[#0a0a0b] border border-indigo-500/20 text-indigo-400 font-black  text-tiny  hover:bg-indigo-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/5"
                        >
                            Open Master Kernel
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
