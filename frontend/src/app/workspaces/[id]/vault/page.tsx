'use client';

import { useParams } from 'next/navigation';
import { KnowledgeBase } from '@/components/knowledge-base';
import { Database, Layers, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VaultPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
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
                                <span className="text-tiny font-bold tracking-[0.2em]">Indexed files</span>
                            </div>
                            <div className="text-h2 font-bold text-white">Ready</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Your files are ready for search.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-3 text-gray-500">
                                <HardDrive size={18} />
                                <span className="text-tiny font-bold tracking-[0.2em]">Storage</span>
                            </div>
                            <div className="text-h2 font-bold text-white">Active</div>
                            <div className="text-tiny text-gray-600 font-bold leading-relaxed">Files are stored securely.</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-[2rem] flex flex-col gap-4 shadow-xl shadow-indigo-500/5"
                        >
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Database size={18} />
                                <span className="text-tiny font-bold tracking-[0.2em]">Search space</span>
                            </div>
                            <div className="text-h2 font-bold text-indigo-500">Active</div>
                            <div className="text-tiny text-indigo-400/50 font-bold leading-relaxed">Searching in this workspace.</div>
                        </motion.div>
                    </div>

                    {/* Main UI */}
                    <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 min-h-[500px]">
                        <div className="mb-8 flex items-center justify-between">
                            <h3 className="text-h3 font-bold">Files</h3>
                        </div>
                        <KnowledgeBase workspaceId={workspaceId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
