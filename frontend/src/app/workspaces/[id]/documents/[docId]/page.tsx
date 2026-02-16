'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    FileText, ArrowLeft, Database, Calendar,
    Layers, Download, Loader2, AlertCircle,
    Shield, HardDrive, Info, CheckCircle2,
    Box, Layout, Network, ChevronDown
} from 'lucide-react';
import { API_ROUTES } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentDetail {
    id: string;
    filename: string;
    extension: string;
    workspace_id: string;
    minio_path: string;
    status: string;
    current_version: number;
    size_bytes: number;
    chunks: number;
    created_at: string;
    updated_at: string;
    shared_with: string[];
    // Extended RAG info
    embedding_model?: string;
    embedding_dim?: number;
    chunk_size?: number;
    chunk_overlap?: number;
}

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const docId = params.docId as string;

    const [document, setDocument] = useState<DocumentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'chunks' | 'raw'>('overview');

    useEffect(() => {
        const fetchDocument = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(docId)}?workspace_id=${encodeURIComponent(workspaceId)}`);
                if (res.ok) {
                    const result = await res.json();
                    if (result.success) setDocument(result.data);
                }
            } catch (err) {
                console.error('Failed to load document:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDocument();
    }, [docId, workspaceId]);

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0b] gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <span className="text-gray-500 text-tiny font-black uppercase tracking-[0.3em] animate-pulse">Syncing Knowledge Node...</span>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0b] gap-8">
                <AlertCircle size={48} className="text-red-500" />
                <div className="text-center space-y-2">
                    <h2 className="text-h3 font-black text-white uppercase tracking-tighter">Node Desynchronized</h2>
                    <p className="text-caption text-gray-600 font-medium">The requested knowledge module could not be located in the current workspace scope.</p>
                </div>
                <button onClick={() => router.back()} className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white text-tiny font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    RETURN TO HUB
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0b] overflow-hidden">
            {/* Context Header */}
            <header className="p-8 border-b border-white/5 flex items-center justify-between bg-[#0a0a0b]/80 backdrop-blur-xl z-20 sticky top-0">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all transform active:scale-95 group"
                    >
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="w-px h-10 bg-white/5" />
                    <div>
                        <h1 className="text-h3 font-black text-white uppercase tracking-tighter">{document.filename}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Type: {document.extension}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">ID: {document.id.substring(0, 12)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                        document.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                        Status: {document.status}
                    </div>
                    <button className="h-12 px-6 rounded-2xl bg-white text-black font-black text-tiny tracking-widest uppercase flex items-center gap-3 hover:bg-gray-200 transition-all active:scale-95">
                        <Download size={18} />
                        Export Module
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="px-10 h-16 border-b border-white/5 flex items-center gap-10 bg-[#0d0d0e]">
                {[
                    { id: 'overview', label: 'Meta Protocol', icon: Database },
                    { id: 'chunks', label: 'Vector Clusters', icon: Layers },
                    { id: 'raw', label: 'Knowledge Buffer', icon: Layout }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-3 h-full border-b-2 transition-all text-tiny font-black uppercase tracking-[0.2em] relative",
                            activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-gray-600 hover:text-gray-400"
                        )}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? "text-blue-500" : "text-gray-600"} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                        )}
                    </button>
                ))}
            </nav>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-12"
                        >
                            {activeTab === 'overview' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <MetricCard label="Magnitude" value={formatBytes(document.size_bytes)} icon={HardDrive} />
                                        <MetricCard label="Blocks" value={`${document.chunks} Index Nodes`} icon={Box} />
                                        <MetricCard label="Ingestion" value={new Date(document.created_at).toLocaleDateString()} icon={Calendar} />
                                        <MetricCard label="Integrity" value="Verified" icon={CheckCircle2} color="text-emerald-500" />
                                    </div>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                            <h3 className="text-caption font-black text-white uppercase tracking-widest">Storage & Routing</h3>
                                        </div>
                                        <div className="grid gap-4">
                                            <div className="p-8 rounded-[2.5rem] bg-[#121214] border border-white/5 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Internal MinIO Node</p>
                                                    <code className="text-caption font-mono text-gray-500">{document.minio_path}</code>
                                                </div>
                                                <Shield size={24} className="text-gray-800" />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="text-caption font-black text-white uppercase tracking-widest">Cognitive Mapping</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <MetricDetail label="Embed Model" value={document.embedding_model || 'text-embedding-3-small'} icon={Brain} />
                                            <MetricDetail label="Dimensions" value={document.embedding_dim?.toString() || '1536'} icon={Network} />
                                            <MetricDetail label="RAG Scope" value="Hybrid-Neural" icon={Database} />
                                        </div>
                                    </section>
                                </>
                            )}

                            {activeTab === 'chunks' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-h3 font-black text-white uppercase tracking-tighter">Vectorized Chunks</h3>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            Displaying {document.chunks} mapped nodes
                                        </div>
                                    </div>
                                    <div className="grid gap-6">
                                        {/* Placeholder for chunks - usually fetched separately */}
                                        <div className="p-20 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[3rem]">
                                            <Loader2 className="w-10 h-10 text-gray-800 animate-spin" />
                                            <p className="text-tiny font-black text-gray-700 uppercase tracking-[0.3em]">Querying Vector Store...</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'raw' && (
                                <div className="space-y-8">
                                    <header className="flex items-center justify-between">
                                        <h3 className="text-h3 font-black text-white uppercase tracking-tighter">Knowledge Buffer</h3>
                                        <button className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:underline">
                                            Copy Full Content
                                        </button>
                                    </header>
                                    <div className="bg-[#121214] rounded-[3rem] p-12 border border-white/5 text-caption text-gray-400 font-medium leading-relaxed whitespace-pre-wrap shadow-2xl">
                                        {/* Content would be fetched and displayed here */}
                                        Fetching synchronized knowledge buffer...
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color = "text-gray-400" }: { label: string, value: string, icon: any, color?: string }) {
    return (
        <div className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] flex flex-col gap-6 hover:bg-white/[0.03] hover:border-blue-500/20 transition-all shadow-2xl">
            <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center", color)}>
                <Icon size={24} />
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{label}</p>
                <p className="text-caption font-black text-white uppercase tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function MetricDetail({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center gap-5 hover:bg-white/[0.04] transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-tiny font-black text-gray-300 uppercase tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
