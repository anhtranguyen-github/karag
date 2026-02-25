'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Upload, Trash2, Search, Loader2, List, LayoutGrid,
    Shield, Database, HardDrive, Calendar,
    CheckCircle2, AlertCircle, X, Info
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useError } from '@/context/error-context';
import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/modal';

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
    const toast = useToast();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    const [isDeletingFile, setIsDeletingFile] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = await api.listAllDocumentsWorkspacesWorkspaceIdDocumentsAllGet({
                workspaceId: workspaceId!
            });
            if (payload.success && payload.data) {
                setDocuments(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];

        setIsUploading(true);

        try {
            const payload = await api.uploadDocumentWorkspacesWorkspaceIdUploadPost({
                workspaceId: workspaceId!,
                file: file
            });
            if (payload.success) {
                toast.success(`${file.name} uploaded successfully`);
                fetchDocuments();
            } else {
                showError("Upload Failed", payload.message || "Failed to upload document.");
            }
        } catch (err) {
            console.error('Upload failed', err);
            showError("Network Error", "Unable to connect to service.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;
        const docName = docToDelete.filename;
        const toastId = toast.loading(`Deleting ${docName}...`);

        setDocToDelete(null); // Close modal immediately

        try {
            const payload = await api.deleteDocumentWorkspacesWorkspaceIdDocumentsDocumentIdDelete({
                workspaceId: workspaceId!,
                documentId: docToDelete.filename, // Using filename as identifier for now based on legacy logic, check if id is better
                vaultDelete: !workspaceId
            });
            toast.dismiss(toastId);
            if (payload.success) {
                toast.success(`Successfully deleted ${docName}`);
                setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
                if (selectedDoc?.id === docToDelete.id) setSelectedDoc(null);
            } else {
                toast.error(`Failed to delete ${docName}`);
            }
        } catch (err) {
            console.error('Delete failed', err);
            toast.dismiss(toastId);
            toast.error(`Network error deleting ${docName}`);
        }
    };

    const handleDelete = (doc: Document) => {
        setDocToDelete(doc);
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
                        className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-tiny font-bold tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-blue-600/10 active:scale-95 disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isUploading ? 'Uploading...' : 'Upload file'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-50">
                    <Loader2 size={40} className="animate-spin text-blue-500" />
                    <p className="text-tiny font-bold tracking-[0.3em] text-gray-500">Loading files...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-gray-700 mb-6">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-h3 font-bold text-white mb-2 tracking-tight">No files found</h3>
                    <p className="text-caption text-gray-600 max-w-xs font-medium leading-relaxed">
                        Try refining your search or upload a new file to this workspace.
                    </p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#121214]/50">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 h-14 bg-white/[0.02]">
                                <th className="pl-8 text-[10px] font-bold text-gray-600">File</th>
                                <th className="text-[10px] font-bold text-gray-600">Size</th>
                                <th className="text-[10px] font-bold text-gray-600">Details</th>
                                <th className="text-[10px] font-bold text-gray-600">Status</th>
                                <th className="pr-8 text-right text-[10px] font-bold text-gray-600">Actions</th>
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
                                                <p className="text-tiny font-bold text-gray-200 group-hover:text-blue-400 transition-colors tracking-tight">{doc.filename}</p>
                                                <p className="text-[9px] text-gray-600 font-bold">{doc.extension} • {formatDate(doc.created_at)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-tiny font-bold text-gray-400">{formatBytes(doc.size_bytes)}</td>
                                    <td className="text-tiny font-bold text-gray-400">{doc.chunks} chunks</td>
                                    <td>
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold",
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

                            <h4 className="text-caption font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight line-clamp-1 mb-2">
                                {doc.filename}
                            </h4>
                            <p className="text-[10px] text-gray-600 font-bold mb-6">
                                {doc.extension} • {formatBytes(doc.size_bytes)}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-bold border",
                                    doc.status === 'indexed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}>
                                    {doc.status}
                                </div>
                                <div className="text-[10px] font-bold text-gray-700">{doc.chunks} chunks</div>
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

            <DeleteDocumentModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={confirmDelete}
                doc={docToDelete}
                isVault={!workspaceId}
                isDeleting={isDeletingFile}
            />
        </div>
    );
}

function DocumentDetailPanel({ doc, workspaceId, onClose }: { doc: Document, workspaceId?: string, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const payload = await api.getDocumentWorkspacesWorkspaceIdDocumentsDocumentIdGet({
                    workspaceId: workspaceId!,
                    documentId: doc.id
                });
                if (payload.success && payload.data) {
                    setContent(payload.data.content);
                }
            } catch (err) {
                console.error('Failed to fetch content', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [doc.id, workspaceId]);

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
                            <h2 className="text-h3 font-bold text-white tracking-tighter">{doc.filename}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-tiny font-bold text-gray-500">{doc.extension} file</span>
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="text-tiny font-bold text-blue-500">ID: {doc.id.substring(0, 12)}</span>
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
                        { id: 'content', label: 'Content', icon: LayoutGrid },
                        { id: 'metadata', label: 'Details', icon: Database }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'content' | 'metadata')}
                            className={cn(
                                "flex items-center gap-3 h-full border-b-2 transition-all text-tiny font-bold",
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
                                        <span className="text-tiny font-bold tracking-widest">Loading...</span>
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
                                    <p className="font-bold tracking-widest">Empty</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="grid grid-cols-2 gap-4">
                                <MetaStat label="File size" value={formatBytes(doc.size_bytes)} icon={HardDrive} />
                                <MetaStat label="Chunks" value={`${doc.chunks} units`} icon={Database} />
                                <MetaStat label="Created at" value={formatDate(doc.created_at)} icon={Calendar} />
                                <MetaStat label="Status" value={doc.status} icon={CheckCircle2} color="text-emerald-500" />
                            </div>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-bold text-gray-700 ml-1">Workspace</h4>
                                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <p className="text-tiny font-bold text-white tracking-tight">{doc.workspace_name || 'Vault'}</p>
                                            <p className="text-[9px] text-gray-600 font-bold">{doc.workspace_id || 'SYSTEM_ROOT'}</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                                        Indexed
                                    </div>
                                </div>
                            </section>

                            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                                <Info size={18} className="text-indigo-400 shrink-0 mt-1" />
                                <p className="text-tiny text-indigo-400/60 font-medium leading-relaxed">
                                    This document is part of the workspace. Deletion here will only remove the workspace-specific embeddings unless executed via the Vault.
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
                <p className="text-[10px] font-bold text-gray-700 mb-1">{label}</p>
                <p className="text-caption font-bold text-gray-300">{value}</p>
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

function DeleteDocumentModal({
    isOpen, onClose, onConfirm, doc, isVault, isDeleting
}: {
    isOpen: boolean; onClose: () => void; onConfirm: () => void; doc: Document | null; isVault: boolean; isDeleting: boolean;
}) {
    if (!doc) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <Trash2 size={16} />
                    </div>
                    <span>Destructive Action</span>
                </div>
            )}
            className="max-w-md"
        >
            <div className="flex flex-col gap-6 pt-2">
                <div className="space-y-4">
                    <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-foreground">
                                {isVault ? "Purge Document Globally" : "Remove from Workspace"}
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black opacity-60">
                                {isVault ? "This action may be irreversible" : "Safely Detach Document"}
                            </p>
                        </div>
                    </div>

                    <div className="px-5">
                        <p className="text-xs text-muted-foreground leading-relaxed text-center">
                            {isVault ? (
                                <>
                                    You are about to permanently delete <span className="font-bold text-foreground">"{doc.filename}"</span> from the Vault.
                                    This will wipe its underlying file and all vector data unless it's currently actively used in another workspace.
                                </>
                            ) : (
                                <>
                                    You are removing <span className="font-bold text-foreground">"{doc.filename}"</span> from this workspace.
                                    Its specific vector indexes here will be dropped, but the file remains safely accessible in the global Vault.
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-2xl bg-secondary border border-border text-[9px] font-black tracking-[0.2em] uppercase hover:bg-secondary/80 transition-all active:scale-95"
                    >
                        Abort
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={cn(
                            "flex-[1.5] h-12 rounded-2xl bg-red-500 text-white text-[9px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95",
                            isDeleting ? "opacity-50" : "hover:bg-red-600"
                        )}
                    >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isDeleting ? "Purging..." : "Confirm"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
