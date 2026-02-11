'use client';

import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Trash2, Loader2,
    Database, Search, Eye,
    Plus, Filter, Shield, ArrowRight, AlertTriangle,
    ArrowRightLeft, Layers, X, Zap, ChevronDown, Network
} from 'lucide-react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useError } from '@/context/error-context';
import { getIllegalCharsFound } from '@/lib/constants';
import { useTasks } from '@/context/task-context';

interface Document {
    id?: string;
    name: string;
    extension: string;
    chunks: number;
    status: string; // Added for Vault logic
    shared?: boolean;
    workspace_id?: string;
    workspace_name?: string;
}

// Task type is now managed globally by TaskContext

interface BackendDocument {
    id: string;
    filename: string;
    extension: string;
    chunks: number;
    status: string;
    workspace_id: string;
    workspace_name?: string;
}

interface Workspace {
    id: string;
    name: string;
}

interface KnowledgeBaseProps {
    workspaceId?: string;
    isSidebar?: boolean;
    isGlobal?: boolean;
}

export function KnowledgeBase({ workspaceId = "default", isSidebar = false, isGlobal = false }: KnowledgeBaseProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_error, setError] = useState<string | null>(null);
    const { showError } = useError();
    const { activeTasks, recentCompletedTasks } = useTasks();
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [isViewing, setIsViewing] = useState(false);
    const [shareTarget, setShareTarget] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
    const [managingDoc, setManagingDoc] = useState<Document | null>(null);
    const [manageMode, setManageMode] = useState<'move' | 'share'>('share');
    const [isManaging, setIsManaging] = useState(false);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [duplicateData, setDuplicateData] = useState<{
        id: string;
        name: string;
        workspace: string;
        is_duplicate: boolean;
    } | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [isVaultBrowserOpen, setIsVaultBrowserOpen] = useState(false);
    const [vaultDocuments, setVaultDocuments] = useState<Document[]>([]);
    const [isVaultLoading, setIsVaultLoading] = useState(false);

    // Poll for active tasks
    const fetchDocuments = React.useCallback(async () => {
        try {
            const url = isGlobal
                ? (API_ROUTES as any).VAULT
                : `${API_ROUTES.DOCUMENTS}?workspace_id=${encodeURIComponent(workspaceId)}`;

            const res = await fetch(url);
            if (res.ok) {
                const payload = await res.json();
                const data: BackendDocument[] = payload.data || [];
                const mappedDocs = data.map((doc) => ({
                    id: doc.id,
                    name: doc.filename,
                    extension: doc.extension,
                    chunks: doc.chunks,
                    status: doc.status,
                    shared: !isGlobal && doc.workspace_id !== workspaceId,
                    workspace_id: doc.workspace_id,
                    workspace_name: doc.workspace_name || doc.workspace_id
                }));
                setDocuments(mappedDocs);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    }, [isGlobal, workspaceId]);

    const fetchVaultDocuments = async () => {
        setIsVaultLoading(true);
        try {
            const res = await fetch((API_ROUTES as any).VAULT);
            if (res.ok) {
                const payload = await res.json();
                const data: BackendDocument[] = payload.data || [];
                const mappedDocs = data.map((doc) => ({
                    id: doc.id,
                    name: doc.filename,
                    extension: doc.extension,
                    chunks: doc.chunks,
                    status: doc.status,
                    workspace_id: doc.workspace_id,
                    workspace_name: doc.workspace_name || doc.workspace_id
                }));
                // Filter out documents already in this workspace
                const filtered = mappedDocs.filter(vd =>
                    !documents.some(d => d.name === vd.name)
                );
                setVaultDocuments(filtered);
            }
        } catch (err) {
            console.error('Failed to fetch vault', err);
        } finally {
            setIsVaultLoading(false);
        }
    };

    const handleLinkFromVault = async (doc: Document) => {
        // Fire-and-forget: submit and close modal immediately
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: doc.name,
                    target_workspace_id: workspaceId,
                    action: 'link',
                    force_reindex: false
                })
            });

            if (res.ok) {
                setIsVaultBrowserOpen(false);
                // The job will appear in the global JobPanel — no need to block
            } else {
                const payload = await res.json();
                showError("Link Failed", payload.message || 'Could not link document.');
            }
        } catch (err) {
            showError("Network Error", "Transmission interrupted.");
        }
    };

    // Auto-refresh documents when tasks complete (via global TaskContext)
    const prevCompletedCountRef = React.useRef(recentCompletedTasks.length);
    useEffect(() => {
        if (recentCompletedTasks.length > prevCompletedCountRef.current) {
            fetchDocuments();
        }
        prevCompletedCountRef.current = recentCompletedTasks.length;
    }, [recentCompletedTasks.length, fetchDocuments]);

    useEffect(() => {
        if (workspaceId) {
            fetchDocuments();
        }
    }, [workspaceId, fetchDocuments]);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await fetch(API_ROUTES.WORKSPACES);
                if (res.ok) {
                    const payload = await res.json();
                    setWorkspaces(payload.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch workspaces', err);
            }
        };
        fetchWorkspaces();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Optimistic Validation
        const found = getIllegalCharsFound(file.name);
        if (found.length > 0) {
            showError("Invalid Filename", `The filename contains characters that are not allowed: ${found.join(' ')}. Please rename the file and try again.`);
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_ROUTES.UPLOAD}?workspace_id=${encodeURIComponent(workspaceId)}`, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const payload = await res.json();
                // Success branch - payload is AppResponse
                const data = payload.data;
                if (data?.duplicate?.is_duplicate) {
                    setDuplicateData({
                        id: data.duplicate.existing_id,
                        name: data.duplicate.existing_name,
                        workspace: data.duplicate.original_workspace,
                        is_duplicate: true
                    });
                }
            } else {
                const payload = await res.json();
                let title = "Ingestion Rejected";
                let message = payload.message || 'Upload failed';

                if (payload.code === 'VALIDATION_ERROR') {
                    title = "Invalid Filename";
                } else if (payload.code === 'CONFLICT_ERROR' || payload.code === 'DUPLICATE_DETECTED') {
                    title = "Duplicate Document";
                    if (payload.code === 'DUPLICATE_DETECTED' && payload.data) {
                        setDuplicateData({
                            id: payload.data.existing_doc?.id,
                            name: payload.data.existing_doc?.filename,
                            workspace: payload.data.existing_doc?.workspace,
                            is_duplicate: true
                        });
                        return; // Handle via modal
                    }
                }

                setError(message);
                showError(title, message, `File: ${file.name}`);
            }
        } catch (err) {
            setError('Connection error');
            const errorMessage = err instanceof Error ? err.message : 'Failed to reach storage cluster.';
            showError("Network Error", errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const [isArxivModalOpen, setIsArxivModalOpen] = useState(false);
    const [arxivUrl, setArxivUrl] = useState('');
    const [isArxivLoading, setIsArxivLoading] = useState(false);

    const handleArxivUpload = async () => {
        if (!arxivUrl || !workspaceId) return;

        setIsArxivLoading(true);
        try {
            const res = await fetch(`${API_ROUTES.UPLOAD}-arxiv?workspace_id=${encodeURIComponent(workspaceId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: arxivUrl }),
            });

            if (res.ok) {
                setIsArxivModalOpen(false);
                setArxivUrl('');
                const payload = await res.json();
                const data = payload.data;
                if (data?.duplicate?.is_duplicate) {
                    setDuplicateData({
                        id: data.duplicate.existing_id,
                        name: data.duplicate.existing_name,
                        workspace: data.duplicate.original_workspace,
                        is_duplicate: true
                    });
                }
            } else {
                const payload = await res.json();
                if (payload.code === 'DUPLICATE_DETECTED' && payload.data) {
                    setIsArxivModalOpen(false);
                    setArxivUrl('');
                    setDuplicateData({
                        id: payload.data.existing_doc?.id,
                        name: payload.data.existing_doc?.filename,
                        workspace: payload.data.existing_doc?.workspace,
                        is_duplicate: true
                    });
                    return;
                }
                showError("ArXiv Import Failed", payload.message || 'Failed to download paper', `Source: ${arxivUrl}`);
            }
        } catch (err) {
            console.error('ArXiv error:', err);
            showError("Network Error", "Could not connect to reasoning engine.");
        } finally {
            setIsArxivLoading(false);
        }
    };

    const handleConfirmLink = async () => {
        if (!duplicateData) return;
        setIsLinking(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: duplicateData.name,
                    target_workspace_id: workspaceId,
                    action: 'link',
                    force_reindex: false
                })
            });

            if (res.ok) {
                setDuplicateData(null);
                fetchDocuments();
            } else {
                const payload = await res.json();
                showError("Link Failed", payload.message || 'Could not link existing document.');
            }
        } catch (err) {
            console.error('Link error:', err);
            showError("Network Error", "Transmission interrupted.");
        } finally {
            setIsLinking(false);
        }
    };

    const handleDelete = async (name: string, vaultDelete: boolean = false) => {
        try {
            const url = new URL(API_ROUTES.DOCUMENT_DELETE(name));
            url.searchParams.append('workspace_id', workspaceId);
            if (vaultDelete) {
                url.searchParams.append('vault_delete', 'true');
            }

            const res = await fetch(url.toString(), {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.name !== name));
                setDeletingDoc(null);
            } else {
                const payload = await res.json();
                showError("Operation Failed", payload.message || 'Document deletion failed.', `Resource: ${name}`);
            }
        } catch (err) {
            console.error('Failed to delete document', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete deletion request.';
            showError("Network Error", errorMessage);
        }
    };

    const handleManage = async () => {
        if (!managingDoc || !shareTarget) return;

        setIsManaging(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: managingDoc.name,
                    target_workspace_id: shareTarget,
                    action: manageMode,
                    force_reindex: true
                })
            });

            if (res.ok) {
                // Fire-and-forget: close modal, progress visible in JobPanel
                setManagingDoc(null);
                setShareTarget('');
            } else {
                const payload = await res.json();
                showError("Transition Failed", payload.message || 'Workspace update failed.', `Document: ${managingDoc.name}`);
            }
        } catch (err) {
            console.error('Failed to manage document', err);
            const errorMessage = err instanceof Error ? err.message : 'Transmission lost during re-indexing.';
            showError("Network Error", errorMessage);
        } finally {
            setIsManaging(false);
        }
    };

    const handleView = async (name: string) => {
        setIsViewing(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_GET(name));
            if (res.ok) {
                const payload = await res.json();
                const data = payload.data;
                setActiveSource({
                    id: 0,
                    name: data.name || data.filename,
                    content: data.content
                });
                fetchDocuments(); // Refresh status/fragments after on-demand indexing

            } else {
                const payload = await res.json();
                showError("Retrieval Failure", payload.message || 'Could not fetch document content.', `Source: ${name}`);
            }
        } catch (err) {
            console.error('Failed to view document', err);
            const errorMessage = err instanceof Error ? err.message : 'Connection to secondary index lost.';
            showError("Network Error", errorMessage);
        } finally {
            setIsViewing(false);
        }
    };

    const handleIndex = async (doc: Document) => {
        const docId = doc.id || doc.name;
        // Fire-and-forget: submit indexing, progress shown in global JobPanel
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(docId)}/index?workspace_id=${encodeURIComponent(doc.workspace_id || workspaceId)}`, {
                method: 'POST'
            });
            if (!res.ok) {
                const payload = await res.json();
                showError("Indexing Error", payload.message || 'Manual indexing failed.');
            }
            // Task created — progress visible in the persistent JobPanel
        } catch (err) {
            console.error('Failed to index document', err);
            showError("Network Error", "Could not reach the indexing service.");
        }
    };

    if (isSidebar) {
        return (
            <div className="flex flex-col gap-3 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                    {documents.map((doc) => (
                        <div
                            key={doc.id || `${doc.name}-${doc.workspace_id}`}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all relative border border-transparent hover:border-white/5"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={14} className="text-gray-600 shrink-0 group-hover:text-indigo-400 transition-colors" />
                                <span className="text-tiny text-gray-400 truncate font-medium">{doc.name}</span>
                            </div>
                            <button
                                onClick={() => setDeletingDoc(doc)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all active:scale-90"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {documents.length === 0 && !isUploading && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                            <Database size={24} className="mb-2" />
                            <span className="text-tiny font-black uppercase tracking-widest text-center px-4 leading-relaxed">System Index Empty</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-1 py-4 mt-2">
                    <button
                        onClick={() => setIsArxivModalOpen(true)}
                        className="flex-1 group flex items-center justify-center gap-3 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-gray-500 hover:text-blue-400 transition-all text-tiny font-black uppercase tracking-widest"
                    >
                        <Network size={14} className="group-hover:rotate-12 transition-transform" />
                        ArXiv
                    </button>
                    <label className="cursor-pointer group flex items-center justify-center gap-3 h-10 w-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-dashed border-white/10 text-gray-500 hover:text-white transition-all text-tiny font-black uppercase tracking-widest">
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-10 bg-[#121214] rounded-[2.5rem] h-full border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30" />

            {/* ArXiv Modal */}
            <AnimatePresence>
                {isArxivModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsArxivModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Network size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white uppercase tracking-tight">ArXiv Import</h4>
                                        <p className="text-tiny text-gray-500 font-bold uppercase tracking-widest">Neural Source Acquisition</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsArxivModalOpen(false)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-tiny font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Paper Link or ID</label>
                                    <input
                                        type="text"
                                        placeholder="https://arxiv.org/abs/1706.03762 or 1706.03762"
                                        value={arxivUrl}
                                        onChange={(e) => setArxivUrl(e.target.value)}
                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 h-14 text-caption text-white focus:ring-2 ring-blue-500/20 outline-none font-medium transition-all hover:border-white/20"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleArxivUpload()}
                                    />
                                </div>

                                <button
                                    onClick={handleArxivUpload}
                                    disabled={!arxivUrl || isArxivLoading}
                                    className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-2xl font-black text-tiny uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isArxivLoading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Initialize Acquisition
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Vault Browser Modal */}
            <AnimatePresence>
                {isVaultBrowserOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsVaultBrowserOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white uppercase tracking-tight">Vault Browser</h4>
                                        <p className="text-tiny text-gray-500 font-bold uppercase tracking-widest">Select Intelligence to Link</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsVaultBrowserOpen(false)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                {isVaultLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 size={32} className="animate-spin text-indigo-400" />
                                        <span className="text-tiny font-black text-gray-600 uppercase tracking-widest">Scanning Global Vault...</span>
                                    </div>
                                ) : vaultDocuments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                        <Database size={48} className="text-gray-600" />
                                        <span className="text-tiny font-black text-gray-600 uppercase tracking-widest">No New Entities Found</span>
                                    </div>
                                ) : (
                                    vaultDocuments.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10">
                                                    <FileText size={18} className="text-gray-500 group-hover:text-indigo-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-caption font-bold text-white uppercase tracking-tight">{doc.name}</span>
                                                    <span className="text-tiny text-gray-500 uppercase font-medium">{doc.extension?.replace('.', '')} • FROM {doc.workspace_name}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleLinkFromVault(doc)}
                                                disabled={isLinking}
                                                className="h-10 px-6 rounded-xl bg-white text-black hover:bg-gray-200 text-tiny font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isLinking ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                Link
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Duplicate Confirmation Modal */}
            <AnimatePresence>
                {duplicateData && (
                    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-10 text-center space-y-8">
                                <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                                    <AlertTriangle size={40} className="text-indigo-400" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-h2 font-black text-white uppercase tracking-tighter">Vault Match Detected</h2>
                                    <p className="text-caption text-gray-500 font-medium leading-relaxed px-4">
                                        This document is already registered in the <span className="text-indigo-400 font-bold">Intelligence Vault</span>.
                                        Would you like to link the existing record to this workspace instead of creating a duplicate?
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleConfirmLink}
                                        disabled={isLinking}
                                        className="w-full h-16 bg-white text-black hover:bg-gray-200 rounded-[1.5rem] font-black text-tiny uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {isLinking ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={18} />}
                                        Link Existing Entry
                                    </button>
                                    <button
                                        onClick={() => setDuplicateData(null)}
                                        className="w-full h-16 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-[1.5rem] font-black text-tiny uppercase tracking-[0.2em] transition-all"
                                    >
                                        Continue with New Upload
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
                        <Database className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-h3 font-black text-white uppercase tracking-tight">Intelligence Vault</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-tiny font-bold text-gray-500 uppercase tracking-widest">Neural Vector Index</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="text-tiny text-indigo-400">{documents.length} ENTITIES</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
                    <div className="relative w-full group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search intelligence sources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-tiny text-white focus:outline-none focus:ring-2 ring-indigo-500/20 focus:bg-white/[0.05] transition-all placeholder:text-gray-700"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsArxivModalOpen(true)}
                        className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white transition-all active:scale-95 text-tiny font-black uppercase tracking-widest"
                    >
                        <Network size={14} className="text-blue-400" />
                        ArXiv
                    </button>
                    {!isGlobal && (
                        <button
                            onClick={() => {
                                fetchVaultDocuments();
                                setIsVaultBrowserOpen(true);
                            }}
                            className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95 text-tiny font-black uppercase tracking-widest"
                        >
                            <Database size={14} />
                            Vault
                        </button>
                    )}
                    <label className="cursor-pointer h-12 px-6 flex items-center gap-3 rounded-2xl bg-white hover:bg-white/90 text-black shadow-xl transition-all active:scale-95 text-tiny font-black uppercase tracking-widest">
                        <Upload size={14} />
                        Upload
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>

            {isUploading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/20"
                >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-tiny font-black text-indigo-300 uppercase tracking-wider mb-1">Streaming to Server...</div>
                        <div className="w-full bg-indigo-500/10 h-1 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-indigo-400"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {(() => {
                        const filtered = documents.filter(doc =>
                            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.workspace_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.extension?.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (filtered.length === 0 && !isUploading) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center mb-6">
                                        <Search size={40} />
                                    </div>
                                    <h4 className="text-caption font-black uppercase tracking-[0.2em] mb-2">
                                        {searchQuery ? "No Matches Found" : "Vault Empty"}
                                    </h4>
                                    <p className="text-tiny text-gray-500 uppercase font-bold tracking-widest">
                                        {searchQuery ? "Refine your search parameters" : "No intelligence sources indexed"}
                                    </p>
                                </div>
                            );
                        }

                        return filtered.map((doc, idx) => (
                            <motion.div
                                key={doc.id || `${doc.name}-${doc.workspace_id}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group flex items-center justify-between p-6 rounded-[2rem] bg-[#0a0a0b] border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/[0.02]"
                            >
                                <div className="flex items-center gap-6 overflow-hidden">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                        <FileText className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span
                                            data-testid="doc-name"
                                            data-doc-name={doc.name}
                                            className="text-caption font-black text-white truncate max-w-[200px] uppercase tracking-tight"
                                        >
                                            {doc.name}
                                        </span>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-tiny text-gray-600 uppercase">{doc.extension?.replace('.', '') || 'FILE'}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                                            {doc.status === 'indexed' ? (
                                                <span className="text-tiny text-indigo-400/50 font-black uppercase tracking-widest">{doc.chunks} Fragments</span>
                                            ) : (
                                                <span className="text-tiny text-amber-400/50 font-black uppercase tracking-widest flex items-center gap-2">
                                                    Vault Persistence
                                                </span>
                                            )}
                                            {isGlobal && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                    <span className="text-tiny px-2 py-0.5 rounded bg-white/5 text-gray-500 uppercase font-bold tracking-widest">
                                                        {doc.workspace_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {doc.status !== 'indexed' && (
                                        <button
                                            onClick={() => handleIndex(doc)}
                                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-90"
                                            title="Neural Indexing (On-Demand)"
                                        >
                                            <Zap size={18} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleView(doc.name)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"
                                        title="View Content"
                                    >
                                        {isViewing && activeSource?.name === doc.name ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>

                                    {!doc.shared && isGlobal && (
                                        <button
                                            onClick={() => setManagingDoc(doc)}
                                            className={cn(
                                                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90",
                                                managingDoc?.name === doc.name ? "bg-indigo-600 text-white shadow-lg" : "bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10"
                                            )}
                                            title="Manage Availability"
                                        >
                                            <ArrowRightLeft size={18} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setDeletingDoc(doc)}
                                        data-testid={`delete-doc-${doc.name}`}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                                        title="Purge Document"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ));
                    })()}
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-tiny font-black text-emerald-500 uppercase tracking-widest">
                        <Shield className="w-3 h-3" />
                        Indexed
                    </div>
                    <div className="flex items-center gap-2 text-tiny font-black text-blue-500 uppercase tracking-widest">
                        <Filter className="w-3 h-3" />
                        Hybrid Active
                    </div>
                </div>

                <Link
                    href="/"
                    className="text-tiny font-black uppercase tracking-[0.2em] text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-2 group"
                >
                    System Protocol v1.4
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <AnimatePresence>
                {managingDoc && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setManagingDoc(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <ArrowRightLeft size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white uppercase tracking-tight">Lifecycle Manager</h4>
                                        <p className="text-tiny text-gray-500 font-bold uppercase tracking-widest">Global Document Redistribution</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setManagingDoc(null)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-tiny font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Distribution Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setManageMode('share')}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left",
                                                manageMode === 'share' ? "bg-indigo-500/10 border-indigo-500/30 text-white" : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Layers size={18} />
                                                {manageMode === 'share' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                            </div>
                                            <span className="text-tiny font-black uppercase">Assign / Share</span>
                                            <span className="text-tiny font-medium leading-relaxed opacity-60">Map document to an additional workspace without removing the current index.</span>
                                        </button>
                                        <button
                                            onClick={() => setManageMode('move')}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left",
                                                manageMode === 'move' ? "bg-orange-500/10 border-orange-500/30 text-white" : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <ArrowRightLeft size={18} />
                                                {manageMode === 'move' && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />}
                                            </div>
                                            <span className="text-tiny font-black uppercase">Transfer / Move</span>
                                            <span className="text-tiny font-medium leading-relaxed opacity-60">Complete migration to target workspace with automated re-indexing and cleanup.</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-tiny font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Target Cluster (Workspace)</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative group">
                                            <select
                                                value={shareTarget}
                                                onChange={(e) => setShareTarget(e.target.value)}
                                                className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 h-14 text-caption text-white focus:ring-2 ring-indigo-500/20 outline-none appearance-none font-medium cursor-pointer transition-all hover:border-white/20"
                                            >
                                                <option value="" disabled className="bg-[#121214]">Select target workspace...</option>
                                                {workspaces
                                                    .filter(ws => ws.id !== (managingDoc?.workspace_id || workspaceId))
                                                    .map(ws => (
                                                        <option key={ws.id} value={ws.id} className="bg-[#121214]">
                                                            {ws.name} ({ws.id})
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none group-hover:text-gray-400 transition-colors" size={16} />
                                        </div>
                                        <button
                                            onClick={handleManage}
                                            disabled={!shareTarget || isManaging}
                                            className={cn(
                                                "h-14 px-8 rounded-2xl font-black text-tiny uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                                                manageMode === 'move' ? "bg-orange-500 text-black hover:bg-orange-400" : "bg-indigo-500 text-white hover:bg-indigo-400"
                                            )}
                                        >
                                            {isManaging ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                                            Initialize {manageMode}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {deletingDoc && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                            onClick={() => setDeletingDoc(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-red-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]"
                        >
                            <div className="p-10 text-center">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-8 animate-pulse">
                                    <AlertTriangle size={40} />
                                </div>
                                <h4 className="text-h3 font-black text-white uppercase tracking-tighter mb-2">Destructive Operation Pending</h4>
                                <p className="text-tiny text-gray-500 leading-relaxed max-w-[280px] mx-auto font-medium mb-10">
                                    Please specify the scope of removal for <span className="text-white font-bold">{deletingDoc.name}</span>.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => handleDelete(deletingDoc.name, false)}
                                        className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-tiny font-black uppercase tracking-[0.2em]"
                                    >
                                        Remove from {deletingDoc.workspace_name || "Workspace"} only
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deletingDoc.name, true)}
                                        data-testid="confirm-purge-btn"
                                        className="w-full py-5 rounded-2xl bg-red-500 text-black hover:bg-red-400 transition-all text-tiny font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20"
                                    >
                                        Purge Entirely from Global Vault
                                    </button>
                                    <button
                                        onClick={() => setDeletingDoc(null)}
                                        className="w-full py-5 text-tiny text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Abort Request
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {activeSource && (
                    <SourceViewer
                        source={activeSource}
                        onClose={() => setActiveSource(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
