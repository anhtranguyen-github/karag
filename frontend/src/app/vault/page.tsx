'use client';

import { KnowledgeBase } from '@/components/knowledge-base';
import { Database, Shield, Layers, HardDrive, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GlobalVaultPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0b]">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Database size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight ">Master Intelligence Vault</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-tiny text-gray-500 font-bold  ">Cross-Workspace Management Console</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                        <Shield size={14} className="text-emerald-500" />
                        <span className="text-tiny font-black text-gray-600 ">Global Access Encryption</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Status Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <Layers size={120} />
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <Layers size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Universal Shards</span>
                            </div>
                            <div className="text-h2 font-black text-white">FEDERATED</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Aggregated document indices from all active neural nodes.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <HardDrive size={120} />
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <HardDrive size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Storage Cluster</span>
                            </div>
                            <div className="text-h2 font-black text-white">REDUNDANT</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Multi-workspace binary persistence via MinIO S3 layer.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-[2rem] flex flex-col gap-4 shadow-xl shadow-indigo-500/5 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.05] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <Database size={120} />
                            </div>
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Database size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Vector Fabric</span>
                            </div>
                            <div className="text-h2 font-black text-indigo-500  ">Unified</div>
                            <div className="text-tiny text-indigo-400/50 font-bold leading-relaxed">Global document namespace with distinct isolation protocols.</div>
                        </motion.div>
                    </div>

                    {/* Main UI */}
                    <KnowledgeBase isGlobal={true} />
                </div>
            </main>
        </div>
    );
}
