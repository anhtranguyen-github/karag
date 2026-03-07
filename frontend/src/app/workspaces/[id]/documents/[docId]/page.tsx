'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, FileText, Calendar, Clock,
    HardDrive, Hash, Download, Loader2, AlertCircle,
    Copy, Check, ChevronRight, ExternalLink, FolderOpen
} from 'lucide-react';
import { sdk } from '@/sdk';
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
    content_type?: string;
    content?: string | null;
    download_url?: string;
    embedding_model?: string;
    embedding_dim?: number;
    chunk_size?: number;
    chunk_overlap?: number;
}

interface ChunkData {
    id: string | number;
    text?: string;
    doc_id?: string;
    workspace_id?: string;
    [key: string]: unknown;
}

interface WorkspaceRelation {
    workspace_id: string;
    workspace_name: string;
    status: string;
    chunks: number;
    last_indexed: string;
    is_primary: boolean;
    type: string;
    shared_from?: string;
}

interface InspectData {
    metadata: Record<string, unknown>;
    relationships: WorkspaceRelation[];
    zombies_detected: boolean;
}

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const docId = params.docId as string;

    const [document, setDocument] = useState<DocumentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'chunks' | 'workspaces'>('overview');
    const [chunks, setChunks] = useState<ChunkData[]>([]);
    const [chunksLoading, setChunksLoading] = useState(false);
    const [inspectData, setInspectData] = useState<InspectData | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDocument = async () => {
            setIsLoading(true);
            try {
                const payload = (await sdk.documents.get({
                    workspaceId,
                    documentId: docId
                })) as any;
                if (payload.success) setDocument(payload.data);
            } catch (err) {
                console.error('Failed to load document:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDocument();
    }, [docId, workspaceId]);

    const fetchChunks = useCallback(async () => {
        if (chunks.length > 0) return;
        setChunksLoading(true);
        try {
            const payload = (await sdk.documents.getChunks({
                workspaceId,
                documentId: docId
            })) as any;
            setChunks(payload.data || payload || []);
        } catch (err) {
            console.error('Failed to load chunks:', err);
        } finally {
            setChunksLoading(false);
        }
    }, [docId, workspaceId, chunks.length]);

    const fetchInspect = useCallback(async () => {
        if (inspectData) return;
        try {
            const payload = (await sdk.documents.inspect({
                workspaceId,
                documentId: docId
            })) as any;
            setInspectData(payload.data || null);
        } catch (err) {
            console.error('Failed to inspect document:', err);
        }
    }, [docId, workspaceId, inspectData]);

    useEffect(() => {
        if (activeTab === 'chunks') fetchChunks();
        if (activeTab === 'workspaces') fetchInspect();
    }, [activeTab, fetchChunks, fetchInspect]);

    const copyContent = async () => {
        if (document?.content) {
            await navigator.clipboard.writeText(document.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0b] gap-4">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                <span className="text-sm text-gray-600">Loading document...</span>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0b] gap-6">
                <AlertCircle size={40} className="text-red-500/80" />
                <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold text-white">Document not found</h2>
                    <p className="text-sm text-gray-500">This document doesn&apos;t exist or you don&apos;t have access.</p>
                </div>
                <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-all">
                    Go back
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'content' as const, label: 'Content' },
        { id: 'chunks' as const, label: `Chunks (${document.chunks})` },
        { id: 'workspaces' as const, label: 'Workspaces' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0b] overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#0a0a0b]/90 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-base font-semibold text-white flex items-center gap-2">
                            <FileText size={16} className="text-gray-500" />
                            {document.filename}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                            <span>{document.extension.toUpperCase()}</span>
                            <span>·</span>
                            <span>{formatBytes(document.size_bytes)}</span>
                            <span>·</span>
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                document.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            )}>
                                {document.status}
                            </span>
                        </div>
                    </div>
                </div>

                {document.download_url && (
                    <a
                        href={document.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <Download size={14} />
                        Download
                    </a>
                )}
            </header>

            {/* Tabs */}
            <nav className="px-6 border-b border-white/5 flex items-center gap-1 bg-[#0a0a0b]">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-4 py-3 text-sm transition-all relative",
                            activeTab === tab.id
                                ? "text-white font-medium"
                                : "text-gray-600 hover:text-gray-400"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="doc-tab"
                                className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {activeTab === 'overview' && <OverviewTab document={document} />}
                            {activeTab === 'content' && <ContentTab document={document} copied={copied} onCopy={copyContent} />}
                            {activeTab === 'chunks' && <ChunksTab chunks={chunks} loading={chunksLoading} />}
                            {activeTab === 'workspaces' && <WorkspacesTab data={inspectData} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

/* ── Overview Tab ── */
function OverviewTab({ document }: { document: DocumentDetail }) {
    return (
        <div className="space-y-6">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={HardDrive} label="File Size" value={formatBytes(document.size_bytes)} />
                <StatCard icon={Hash} label="Chunks" value={document.chunks.toString()} />
                <StatCard icon={Calendar} label="Uploaded" value={formatDate(document.created_at)} />
                <StatCard icon={Clock} label="Last Updated" value={formatDate(document.updated_at)} />
            </div>

            {/* Details table */}
            <div className="rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-sm font-medium text-white">Details</h3>
                </div>
                <div className="divide-y divide-white/5">
                    <DetailRow label="Document ID" value={document.id} mono />
                    <DetailRow label="Filename" value={document.filename} />
                    <DetailRow label="Type" value={document.extension.toUpperCase()} />
                    <DetailRow label="Content Type" value={document.content_type || 'Unknown'} />
                    <DetailRow label="Status" value={document.status} badge={document.status === 'indexed' ? 'green' : 'amber'} />
                    <DetailRow label="Version" value={`v${document.current_version}`} />
                    <DetailRow label="Workspace" value={document.workspace_id} />
                    <DetailRow label="Storage Path" value={document.minio_path} mono />
                    {document.shared_with.length > 0 && (
                        <DetailRow label="Shared With" value={document.shared_with.join(', ')} />
                    )}
                </div>
            </div>

            {/* Embedding info (if available) */}
            {(document.embedding_model || document.embedding_dim) && (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-medium text-white">Embedding Config</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        {document.embedding_model && <DetailRow label="Model" value={document.embedding_model} />}
                        {document.embedding_dim && <DetailRow label="Dimensions" value={document.embedding_dim.toString()} />}
                        {document.chunk_size && <DetailRow label="Chunk Size" value={`${document.chunk_size} tokens`} />}
                        {document.chunk_overlap && <DetailRow label="Chunk Overlap" value={`${document.chunk_overlap} tokens`} />}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Content Tab ── */
function ContentTab({ document, copied, onCopy }: { document: DocumentDetail; copied: boolean; onCopy: () => void }) {
    if (document.content === null || document.content === undefined) {
        return (
            <div className="text-center py-16 space-y-3">
                <FileText size={32} className="mx-auto text-gray-700" />
                <p className="text-sm text-gray-500">
                    Content preview is not available for this file type ({document.content_type || document.extension}).
                </p>
                {document.download_url && (
                    <a
                        href={document.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-gray-300 hover:bg-white/10 transition-all"
                    >
                        <ExternalLink size={14} />
                        Open file directly
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{document.content.length.toLocaleString()} characters</span>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#111113] p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <pre className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {document.content}
                </pre>
            </div>
        </div>
    );
}

/* ── Chunks Tab ── */
function ChunksTab({ chunks, loading }: { chunks: ChunkData[]; loading: boolean }) {
    const [expandedChunk, setExpandedChunk] = useState<string | number | null>(null);

    if (loading) {
        return (
            <div className="text-center py-16 space-y-3">
                <Loader2 className="w-6 h-6 mx-auto text-gray-600 animate-spin" />
                <p className="text-sm text-gray-600">Loading chunks...</p>
            </div>
        );
    }

    if (chunks.length === 0) {
        return (
            <div className="text-center py-16 space-y-3">
                <Hash size={32} className="mx-auto text-gray-700" />
                <p className="text-sm text-gray-500">No chunks found for this document.</p>
                <p className="text-xs text-gray-700">The document may not be indexed yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-600 mb-4">{chunks.length} chunks stored in vector database</p>
            {chunks.map((chunk, i) => {
                const isExpanded = expandedChunk === chunk.id;
                const text = chunk.text || JSON.stringify(chunk, null, 2);
                const preview = text.substring(0, 150);

                return (
                    <button
                        key={chunk.id || i}
                        onClick={() => setExpandedChunk(isExpanded ? null : chunk.id)}
                        className="w-full text-left rounded-xl border border-white/5 bg-[#111113] hover:bg-white/[0.03] transition-all overflow-hidden"
                    >
                        <div className="px-4 py-3 flex items-start gap-3">
                            <span className="text-[10px] font-mono text-gray-700 bg-white/5 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                                #{i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm text-gray-400 leading-relaxed",
                                    isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                                )}>
                                    {isExpanded ? text : preview + (text.length > 150 ? '...' : '')}
                                </p>
                            </div>
                            <ChevronRight size={14} className={cn(
                                "text-gray-700 shrink-0 mt-1 transition-transform",
                                isExpanded && "rotate-90"
                            )} />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

/* ── Workspaces Tab ── */
function WorkspacesTab({ data }: { data: InspectData | null }) {
    if (!data) {
        return (
            <div className="text-center py-16 space-y-3">
                <Loader2 className="w-6 h-6 mx-auto text-gray-600 animate-spin" />
                <p className="text-sm text-gray-600">Loading workspace info...</p>
            </div>
        );
    }

    if (data.relationships.length === 0) {
        return (
            <div className="text-center py-16 space-y-3">
                <FolderOpen size={32} className="mx-auto text-gray-700" />
                <p className="text-sm text-gray-500">This document is only in the vault.</p>
                <p className="text-xs text-gray-700">Link it to a workspace to start using it for search and chat.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-600">
                This document is indexed in {data.relationships.length} workspace{data.relationships.length !== 1 ? 's' : ''}.
                {data.zombies_detected && (
                    <span className="text-amber-400 ml-1">Some orphaned references were found.</span>
                )}
            </p>

            <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                {data.relationships.map((rel, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                            <FolderOpen size={14} className="text-gray-600" />
                            <div>
                                <p className="text-sm text-white">{rel.workspace_name}</p>
                                <p className="text-xs text-gray-600 flex items-center gap-2">
                                    <span>{rel.type === 'shared_ref' ? `Shared from ${rel.shared_from}` : 'Direct index'}</span>
                                    <span>·</span>
                                    <span>{rel.chunks} chunks</span>
                                    {rel.last_indexed && (
                                        <>
                                            <span>·</span>
                                            <span>Updated {formatDate(rel.last_indexed)}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-medium",
                            rel.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        )}>
                            {rel.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Shared Components ── */

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/5 bg-[#111113] p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
                <Icon size={14} />
                <span className="text-xs">{label}</span>
            </div>
            <p className="text-sm font-medium text-white">{value}</p>
        </div>
    );
}

function DetailRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: 'green' | 'amber' }) {
    return (
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
            <span className="text-xs text-gray-600 shrink-0">{label}</span>
            {badge ? (
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-medium",
                    badge === 'green' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                )}>
                    {value}
                </span>
            ) : (
                <span className={cn(
                    "text-xs text-gray-300 text-right truncate",
                    mono && "font-mono text-gray-500"
                )}>
                    {value}
                </span>
            )}
        </div>
    );
}

/* ── Utilities ── */

function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
