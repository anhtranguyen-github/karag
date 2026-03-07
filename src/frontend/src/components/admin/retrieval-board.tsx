import React from 'react';
import { motion } from 'framer-motion';
import { Search, Share2, Network, Filter, BarChart3, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/hooks/use-settings';

interface RetrievalBoardProps {
    parseMetric: (name: string, labels?: Record<string, string>) => number;
    settings: AppSettings | null;
}

export function RetrievalBoard({ parseMetric, settings }: RetrievalBoardProps) {
    const rLats = [
        { label: 'Vector Search', value: parseMetric('rag_retrieval_duration_seconds', { engine: 'vector' }), color: 'bg-indigo-500' },
        { label: 'Graph Traversal', value: parseMetric('rag_retrieval_duration_seconds', { engine: 'graph' }), color: 'bg-emerald-500' },
        { label: 'Hybrid Fusion', value: parseMetric('rag_retrieval_duration_seconds', { engine: 'hybrid' }), color: 'bg-amber-500' },
    ];

    const distribution = [
        { label: '1-3 Chunks', value: parseMetric('rag_chunks_retrieved', { le: '3' }), color: 'text-emerald-400' },
        { label: '4-10 Chunks', value: parseMetric('rag_chunks_retrieved', { le: '10' }), color: 'text-indigo-400' },
        { label: '10+ Chunks', value: parseMetric('rag_chunks_retrieved', { le: '20' }), color: 'text-rose-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Retrieval Efficiency */}
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider mb-6 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-400" />
                        Engine Efficiency
                    </h3>
                    <div className="space-y-5">
                        {rLats.map((lat) => (
                            <div key={lat.label} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black tracking-widest text-gray-500">
                                    <span>{lat.label}</span>
                                    <span className="text-white">{lat.value > 0 ? `${lat.value.toFixed(3)}s` : 'N/A'}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(lat.value * 100, 100)}%` }}
                                        className={cn("h-full", lat.color)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Recall Distribution */}
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider mb-6 flex items-center gap-2">
                        <Filter size={16} className="text-emerald-400" />
                        Context Density
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {distribution.map((d) => (
                            <div key={d.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400">{d.label}</span>
                                <span className={cn("text-lg font-black", d.color)}>
                                    {d.value.toLocaleString()} <span className="text-[10px] opacity-50 font-medium">queries</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Global Strategy Config */}
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider mb-6 flex items-center gap-2">
                        <Settings2 size={16} className="text-amber-400" />
                        Active Settings
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-200/50">Reranker Status</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black",
                                    settings?.reranker_enabled ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-500"
                                )}>
                                    {settings?.reranker_enabled ? 'Active' : 'Disabled'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-200/50">Search Limit</span>
                                <span className="text-white font-black text-xs">{settings?.search_limit} Chunks</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-200/50">Rerank Top Results</span>
                                <span className="text-white font-black text-xs">{settings?.rerank_top_k}</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Network size={18} className="text-blue-400" />
                                <span className="text-[10px] font-black text-white tracking-widest">Graph Search</span>
                            </div>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-gray-500 tracking-tighter">Enterprise Only</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Strategy Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Search size={120} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-lg font-black text-white mb-2">Vector-First Retrieval</h4>
                        <p className="text-sm text-gray-500 font-medium mb-6 max-w-sm">
                            Utilizes high-dimensional semantic similarity. Best for conceptual broad searches and multi-lingual alignment.
                        </p>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-indigo-400">Semantic</div>
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-indigo-400">Scalable</div>
                        </div>
                    </div>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Share2 size={120} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-lg font-black text-white mb-2">Hybrid Fusion Ranking</h4>
                        <p className="text-sm text-gray-500 font-medium mb-6 max-w-sm">
                            Combines BM25 keyword matching with Vector search using Reciprocal Rank Fusion (RRF). Best for technical exact-match queries.
                        </p>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-400">Exact Match</div>
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-400">RRF Fusion</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
