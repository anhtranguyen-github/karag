'use client';

import { useParams } from 'next/navigation';
import { KnowledgeBase } from '@/components/knowledge-base';
import { Database, Shield, Layers, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VaultPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
                        <Database size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight ">Knowledge Vault</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-tiny text-gray-500 font-bold  ">Isolated Repository: {workspaceId}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                        <Shield size={14} className="text-green-500" />
                        <span className="text-tiny font-black text-gray-600 ">S3 Encryption Active</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Status Overview */}
                    <div className="grid grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-3 text-gray-500">
                                <Layers size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Neural Shards</span>
                            </div>
                            <div className="text-h2 font-black text-white">INDEXED</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Cross-referenced via Qdrant vector isolation.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-3 text-gray-500">
                                <HardDrive size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Storage State</span>
                            </div>
                            <div className="text-h2 font-black text-white">PERSISTED</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Versioned binary objects stored in MinIO.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-[2rem] flex flex-col gap-4 shadow-xl shadow-indigo-500/5"
                        >
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Database size={18} />
                                <span className="text-tiny font-black  tracking-[0.2em]">Vector Space</span>
                            </div>
                            <div className="text-h2 font-black text-indigo-500  ">Isolated</div>
                            <div className="text-tiny text-indigo-400/50 font-bold leading-relaxed">Workspace-scoped embedding namespace.</div>
                        </motion.div>
                    </div>

                    {/* Main UI */}
                    <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 min-h-[500px]">
                        <div className="mb-8 flex items-center justify-between">
                            <h3 className="text-h3 font-black  ">Inventory Manager</h3>
                            <span className="px-3 py-1 rounded-lg bg-white/5 text-tiny font-bold text-gray-600 border border-white/5">DB REVISION: 1.04</span>
                        </div>
                        <KnowledgeBase workspaceId={workspaceId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
