'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Upload, Trash2, Search, Loader2, List, LayoutGrid,
    Shield, Database, HardDrive, Calendar,
    CheckCircle2, AlertCircle, X, Info
} from 'lucide-react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Document {
    id: string;
    filename: string;
    extension: string;
    status: string;
    size_bytes: number;
    chunks: number;
    created_at: string;
    workspace_id?: string;
    workspace_name?: string;
}

interface DocumentManagerProps {
    workspaceId?: string; // Optional: if provided, filters by workspace
    isGlobal?: boolean;
}

export function DocumentManager({ workspaceId, isGlobal = false }: DocumentManagerProps) {
    const { showError } = useError();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const url = isGlobal
                ? API_ROUTES.DOCUMENTS
                : `${API_ROUTES.DOCUMENTS}?workspace_id=${encodeURIComponent(workspaceId || '')}`;

            const res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setDocuments(result.data);
                }
            }
        } catch {
            console.error('Failed to fetch documents');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, isGlobal]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const url = workspaceId
                ? `${API_ROUTES.UPLOAD}?workspace_id=${encodeURIComponent(workspaceId)}`
                : API_ROUTES.UPLOAD;

            const res = await fetch(url, {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            if (res.ok && result.success) {
                fetchDocuments();
            } else {
                showError("Upload Failed", result.message || "Failed to upload document.");
            }
        } catch {
            showError("Network Error", "Unable to connect to service.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (doc: Document) => {
        try {
            const url = workspaceId
                ? `${API_ROUTES.DOCUMENTS}/${encodeURIComponent(doc.filename)}?workspace_id=${encodeURIComponent(workspaceId)}`
                : `${API_ROUTES.DOCUMENTS}/${encodeURIComponent(doc.id)}`; // System delete uses ID

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                if (selectedDoc?.id === doc.id) setSelectedDoc(null);
            } else {
                showError("Delete Failed", "Unable to remove document.");
            }
        } catch {
            showError("Connection Error", "Failed to reach document service.");
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#0a0a0b] text-white">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-8 gap-6">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by filename or content..."
                        className="w-full pl-12 pr-6 h-12 rounded-2xl bg-[#121214] border border-white/5 focus:border-blue-500/30 text-caption text-white focus:outline-none focus:ring-4 ring-blue-500/5 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-[#121214] border border-white/5 rounded-xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-tiny font-black tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-blue-600/10 active:scale-95 disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isUploading ? 'ENCRYPTING...' : 'INGEST DOC'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-50">
                    <Loader2 size={40} className="animate-spin text-blue-500" />
                    <p className="text-tiny font-black uppercase tracking-[0.3em] text-gray-500">Retrieving Knowledge Buffer...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-gray-700 mb-6">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-h3 font-black text-white mb-2 uppercase tracking-tight">No match found</h3>
                    <p className="text-caption text-gray-600 max-w-xs font-medium leading-relaxed">
                        Try refining your search or ingest a new document module into this workspace.
                    </p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#121214]/50">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 h-14 bg-white/[0.02]">
                                <th className="pl-8 text-[10px] font-black uppercase tracking-widest text-gray-600">Document Hub</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-gray-600">Metric</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-gray-600">Protocol</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-gray-600">Status</th>
                                <th className="pr-8 text-right text-[10px] font-black uppercase tracking-widest text-gray-600">Auth</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="group hover:bg-white/[0.03] border-b border-white/5 transition-all cursor-pointer h-16"
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <td className="pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <p className="text-tiny font-black text-gray-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{doc.filename}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{doc.extension} • {formatDate(doc.created_at)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-tiny font-bold text-gray-400">{formatBytes(doc.size_bytes)}</td>
                                    <td className="text-tiny font-bold text-gray-400">{doc.chunks} Blocks</td>
                                    <td>
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            doc.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                        )}>
                                            <div className={cn("w-1 h-1 rounded-full", doc.status === 'indexed' ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" : "bg-blue-400 animate-pulse")} />
                                            {doc.status}
                                        </div>
                                    </td>
                                    <td className="pr-8 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDocs.map((doc) => (
                        <motion.div
                            layout
                            key={doc.id}
                            onClick={() => setSelectedDoc(doc)}
                            className="group bg-[#121214] rounded-[2.5rem] border border-white/5 p-6 hover:border-blue-500/30 hover:bg-white/[0.03] transition-all cursor-pointer relative overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <FileText size={24} />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h4 className="text-caption font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1 mb-2">
                                {doc.filename}
                            </h4>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-6">
                                {doc.extension} • {formatBytes(doc.size_bytes)}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    doc.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}>
                                    {doc.status}
                                </div>
                                <div className="text-[10px] font-bold text-gray-700">{doc.chunks} Blocks</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detail Overlay */}
            <AnimatePresence>
                {selectedDoc && (
                    <DocumentDetailPanel
                        doc={selectedDoc}
                        workspaceId={workspaceId}
                        onClose={() => setSelectedDoc(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function DocumentDetailPanel({ doc, onClose }: { doc: Document, workspaceId?: string, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(API_ROUTES.DOCUMENT_GET(doc.id));
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        setContent(result.data.content);
                    }
                }
            } catch {
                console.error('Failed to fetch content');
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [doc.id]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                className="relative w-full max-w-4xl h-full bg-[#0d0d0e] border-l border-white/5 shadow-3xl flex flex-col"
            >
                {/* Header */}
                <div className="p-10 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h2 className="text-h3 font-black text-white uppercase tracking-tighter">{doc.filename}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-tiny font-black text-gray-500 uppercase tracking-widest">{doc.extension} Module</span>
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="text-tiny font-black text-blue-500 uppercase tracking-widest">ID: {doc.id.substring(0, 12)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all flex items-center justify-center">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="px-10 h-16 border-b border-white/5 flex items-center gap-8">
                    {[
                        { id: 'content', label: 'Knowledge Buffer', icon: LayoutGrid },
                        { id: 'metadata', label: 'Meta Protocol', icon: Database }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'content' | 'metadata')}
                            className={cn(
                                "flex items-center gap-3 h-full border-b-2 transition-all text-tiny font-black uppercase tracking-[0.2em]",
                                activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-gray-600 hover:text-gray-400"
                            )}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                    {activeTab === 'content' ? (
                        <div className="space-y-8">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20 opacity-30 animate-pulse">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 size={32} className="animate-spin" />
                                        <span className="text-tiny font-black tracking-widest uppercase">Deciphering...</span>
                                    </div>
                                </div>
                            ) : content ? (
                                <div className="prose prose-invert max-w-none">
                                    <div className="bg-black/20 rounded-3xl p-8 border border-white/5 font-medium leading-relaxed text-gray-400 text-caption whitespace-pre-wrap">
                                        {content}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-700">
                                    <AlertCircle size={40} className="mb-4" />
                                    <p className="font-black uppercase tracking-widest">Buffer Empty</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="grid grid-cols-2 gap-4">
                                <MetaStat label="File Magnitude" value={formatBytes(doc.size_bytes)} icon={HardDrive} />
                                <MetaStat label="Cognitive Chunks" value={`${doc.chunks} Units`} icon={Database} />
                                <MetaStat label="Registry Date" value={formatDate(doc.created_at)} icon={Calendar} />
                                <MetaStat label="Protocol State" value={doc.status.toUpperCase()} icon={CheckCircle2} color="text-emerald-500" />
                            </div>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 ml-1">Workspace Allocation</h4>
                                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <p className="text-tiny font-black text-white uppercase tracking-tight">{doc.workspace_name || 'Global System Vault'}</p>
                                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{doc.workspace_id || 'SYSTEM_ROOT'}</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-widest uppercase border border-emerald-500/20">
                                        ACTIVE INDEX
                                    </div>
                                </div>
                            </section>

                            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                                <Info size={18} className="text-indigo-400 shrink-0 mt-1" />
                                <p className="text-tiny text-indigo-400/60 font-medium leading-relaxed italic">
                                    This document is part of the localized knowledge core. Deletion here will only purge the workspace-specific embeddings unless executed via the Global Vault.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function MetaStat({ label, value, icon: Icon, color = "text-gray-400" }: { label: string, value: string, icon: React.ElementType, color?: string }) {
    return (
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-4 hover:bg-white/[0.04] transition-all">
            <div className={cn("mt-1", color)}><Icon size={18} /></div>
            <div>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-caption font-black text-gray-300">{value}</p>
            </div>
        </div>
    );
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
