import React from 'react';
import { Database, AlertTriangle, HardDrive, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VectorCollection {
    name: string;
    config: { vector_size: number; distance: string };
    segments_count: number;
    points_count: number;
    status: string;
}

export interface VectorStatus {
    host?: string;
    port?: number;
    collections?: VectorCollection[];
}

interface DataOpsTabProps {
    vectorStatus: VectorStatus | null;
    parseMetric: (name: string, labels?: Record<string, string>) => number;
}

export function DataOpsTab({ vectorStatus, parseMetric }: DataOpsTabProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Qdrant Status */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                                <HardDrive size={16} className="text-amber-400" />
                                Vector Collections
                            </h3>
                            <div className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2">
                                Host: <span className="text-white">{vectorStatus?.host}:{vectorStatus?.port}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {vectorStatus?.collections?.map((c: VectorCollection) => (
                                <div key={c.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <div className="text-tiny font-black text-white">{c.name}</div>
                                            <div className="text-[10px] text-gray-600 font-bold">
                                                {c.config.vector_size} Dim • {c.config.distance} • {c.segments_count} Segments
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-tiny font-black text-white">{(c.points_count / 1000).toFixed(1)}K Points</div>
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase">{c.status}</span>
                                    </div>
                                </div>
                            ))}
                            {!vectorStatus?.collections?.length && (
                                <div className="p-12 text-center text-gray-600 font-bold border border-dashed border-white/5 rounded-xl">
                                    No active vector collections detected.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Vault Replication</div>
                            <div className="text-xl font-black">S3 Versioning Enabled</div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-emerald-500/70 font-bold uppercase">Consistency: Strong</span>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-[#121214] border border-white/5">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Index Fragmentation</div>
                            <div className="text-xl font-black">0.82%</div>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                                <div className="h-full w-[82%] bg-amber-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ingestion Pipeline */}
                <div className="space-y-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black tracking-wider uppercase mb-5 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-400" />
                            Ingestion Pipeline
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: '.PDF Processing', count: parseMetric('document_ingestions_total', { extension: '.pdf' }), color: 'text-red-400' },
                                { label: '.TXT / .MD Raw', count: parseMetric('document_ingestions_total', { extension: '.txt' }), color: 'text-blue-400' },
                                { label: '.DOCX Office', count: parseMetric('document_ingestions_total', { extension: '.docx' }), color: 'text-indigo-400' },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <div className="text-[11px] font-black text-white">{row.label}</div>
                                        <div className="text-[9px] text-gray-600 font-bold">Latency: 1.2s avg</div>
                                    </div>
                                    <div className={cn("text-tiny font-black", row.count === 0 ? "text-gray-600" : row.color)}>{Number(row.count).toLocaleString()} Docs</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-600/5 border border-amber-500/10">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={18} className="text-amber-400" />
                            <span className="text-tiny font-black text-amber-100 uppercase">Ops Guardrail</span>
                        </div>
                        <p className="text-[10px] text-amber-200/50 leading-relaxed font-medium">
                            Bulk re-indexing across multi-collections consumes intensive I/O. Schedule after hours or use canary collections.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

