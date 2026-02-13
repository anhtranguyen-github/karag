'use client';

import { useParams } from 'next/navigation';
import { ToolsManager } from '@/components/tools-manager';
import { Hammer, Zap, Activity, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgePage() {
    useParams();

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <Hammer size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight ">Capability Forge</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-tiny text-gray-500 font-bold  ">Active Hooks: System Native</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                        <Zap size={14} className="text-green-500" />
                        <span className="text-tiny font-black text-gray-600 ">MCP Protocol V1</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Architectural Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative p-12 rounded-[3rem] bg-gradient-to-br from-[#161619] to-[#0a0a0b] border border-white/5 overflow-hidden group shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-green-500/10 transition-colors duration-1000" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center border border-white/10 shadow-2xl shrink-0 group-hover:rotate-6 transition-transform duration-500">
                                <Cpu size={56} className="text-indigo-400" />
                            </div>
                            <div className="space-y-4 text-center md:text-left">
                                <h3 className="text-h2 font-black   text-white">Neural Tooling Bus</h3>
                                <p className="text-gray-500 text-h3 leading-relaxed max-w-xl font-medium">
                                    Configure the AI Architect's active capabilities. Connect Model Context Protocol (MCP) servers and external API hooks to expand functional reasoning.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-tiny font-black  text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                                        <Activity size={12} />
                                        Streaming Logs: Active
                                    </div>
                                    <div className="flex items-center gap-2 text-tiny font-black  text-gray-600 bg-white/5 px-4 py-2 rounded-xl border border-white/5 leading-none">
                                        LATENCY: 14ms
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main UI */}
                    <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden min-h-[500px]">
                        <div className="mb-10 flex items-center justify-between pb-6 border-b border-white/5">
                            <div>
                                <h3 className="text-h3 font-black  ">Registry Control</h3>
                                <p className="text-gray-600 text-tiny font-bold   mt-1">Manage core system functions and external plugins</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-tiny font-bold text-gray-700 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">PROXIED VIA BASTION</div>
                            </div>
                        </div>
                        <ToolsManager />
                    </div>
                </div>
            </main>
        </div>
    );
}
