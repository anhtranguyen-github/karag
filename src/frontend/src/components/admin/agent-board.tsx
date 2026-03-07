import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, BrainCircuit, Activity, Cpu, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/hooks/use-settings';

interface AgentBoardProps {
    parseMetric: (name: string, labels?: Record<string, string>) => number;
    settings: AppSettings | null;
}

export function AgentBoard({ parseMetric, settings }: AgentBoardProps) {
    const activeStreams = parseMetric('active_chat_streams') || 0;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                                <Terminal size={16} className="text-indigo-400" />
                                Tool Execution
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <Activity size={12} className="text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Ready</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Tool Runs</div>
                                <div className="text-4xl font-black text-white">{activeStreams}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Iterations</div>
                                <div className="text-4xl font-black text-indigo-400">3.2</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tool Success Rate</div>
                                <div className="text-4xl font-black text-emerald-400">98.4%</div>
                            </div>
                        </div>

                        <div className="mt-auto p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BrainCircuit size={20} className="text-indigo-400" />
                                <div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Execution Strategy</div>
                                    <div className="text-xs text-gray-500 font-bold capitalize">Multi-step tool flow</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Max Depth</div>
                                <div className="text-xs text-white font-black">{settings?.agent_max_iterations || 5} Turns</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black tracking-wider uppercase mb-5 flex items-center gap-2">
                            <Cpu size={16} className="text-amber-400" />
                            Tool Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Run Mode</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                    settings?.agentic_enabled ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-500"
                                )}>
                                    {settings?.agentic_enabled ? 'Multi-step' : 'Single-step'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Show Reasoning</span>
                                <span className="text-white text-xs font-black">{settings?.show_reasoning ? 'ON' : 'OFF'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Extended Search</span>
                        </div>
                        <p className="text-[10px] text-indigo-200/50 leading-relaxed font-medium mb-4">
                            Extended search uses repeated tool calls to inspect more sources and build a longer answer.
                        </p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                animate={{ x: [-100, 200] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="w-1/3 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Message */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 border-dashed">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                    <AlertCircle size={20} />
                </div>
                <div className="space-y-1">
                    <h5 className="text-xs font-black text-rose-200 uppercase tracking-wider">Operational Boundary</h5>
                    <p className="text-[10px] text-rose-200/40 font-medium leading-relaxed">
                        High iteration limits ( &gt; 10) significantly increase latency and token usage on follow-up tool calls.
                        Monitor token usage in Model Usage before increasing global limits.
                    </p>
                </div>
            </div>
        </div>
    );
}
