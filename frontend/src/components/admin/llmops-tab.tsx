import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, Cpu, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/hooks/use-settings';

interface LLMOpsTabProps {
    parseMetric: (name: string, labels?: Record<string, string>) => number;
    settings: AppSettings | null;
}

export function LLMOpsTab({ parseMetric, settings }: LLMOpsTabProps) {
    const providers = ['OpenAI', 'Anthropic', 'Ollama', 'Groq'];

    return (
        <div className="space-y-8">
            {/* Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider mb-5 flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        P50 Latency (Sec)
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Retrieval', metric: 'rag_retrieval_duration_seconds_sum', count: 'rag_retrieval_duration_seconds_count', color: 'bg-blue-500' },
                            { label: 'Embedding', metric: 'embedding_request_duration_seconds_sum', count: 'embedding_request_duration_seconds_count', color: 'bg-indigo-500' },
                            { label: 'Generation', metric: 'llm_request_duration_seconds_sum', count: 'llm_request_duration_seconds_count', color: 'bg-purple-500' },
                        ].map((m) => {
                            const sum = parseMetric(m.metric) || 0;
                            const count = parseMetric(m.count) || 1;
                            const avg = sum / count;
                            return (
                                <div key={m.label} className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-black">
                                        <span className="text-gray-500">{m.label}</span>
                                        <span className="text-white">{avg.toFixed(3)}s</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((avg / 2) * 100, 100)}%` }}
                                            className={cn("h-full", m.color)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black tracking-wider flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            Token Allocation & Cost
                        </h3>
                        <div className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Real-time from Instrumentation
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Prompt Tokens', value: parseMetric('llm_tokens_total', { token_type: 'prompt' }), color: 'text-indigo-400' },
                            { label: 'Completion Tokens', value: parseMetric('llm_tokens_total', { token_type: 'completion' }), color: 'text-emerald-400' },
                            { label: 'Total Used', value: parseMetric('llm_tokens_total'), color: 'text-white' },
                            { label: 'Est. Cost', value: `$${((parseMetric('llm_tokens_total') || 0) * 0.00001).toFixed(4)}`, color: 'text-amber-400' },
                        ].map((stat) => (
                            <div key={stat.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-[10px] font-bold text-gray-600 mb-1">{stat.label}</div>
                                <div className={cn("text-xl font-black", stat.color)}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <Cpu size={20} className="text-indigo-400" />
                            <div>
                                <div className="text-tiny font-black text-white">Primary Delivery Model</div>
                                <div className="text-[11px] font-bold text-indigo-300/60">{settings?.llm_model || 'Loading...'}</div>
                            </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-indigo-500 text-black font-black text-[10px] uppercase hover:bg-indigo-400 transition-all">
                            Configure Routing
                        </button>
                    </div>
                </div>
            </div>

            {/* Provider Breakdown */}
            <div className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 tracking-widest">AI Provider</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 tracking-widest text-center">Requests</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 tracking-widest text-center">Avg Latency</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 tracking-widest text-center">Errors</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {providers.map((p) => {
                            const requests = parseMetric('llm_requests_total', { provider: p.toLowerCase() }) || 0;
                            const errors = parseMetric('llm_requests_total', { provider: p.toLowerCase(), status: 'error' }) || 0;
                            const latencySum = parseMetric('llm_request_duration_seconds_sum', { provider: p.toLowerCase() }) || 0;

                            return (
                                <tr key={p} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4 font-black text-sm text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                                            <Server size={14} />
                                        </div>
                                        {p}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400">{requests.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                                        {(latencySum / (requests || 1)).toFixed(2)}s
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn("px-2 py-0.5 rounded font-black text-[9px]", errors > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-500")}>
                                            {errors} Errors
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", requests > (i * 10) ? "bg-emerald-500" : "bg-white/10")} />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
