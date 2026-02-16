'use client';

import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Trash2, Loader2,
    Database, Search, Eye,
    Plus, Filter, Shield, ArrowRight, AlertTriangle,
    ArrowRightLeft, Layers, X, Zap, ChevronDown, Network,
    Globe, Link2, Github, Folder, Music, Info,
    HardDrive, Calendar, Clock, ChevronRight
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useError } from '@/context/error-context';
import { getIllegalCharsFound } from '@/lib/constants';
import { useTasks } from '@/context/task-context';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md', 'docx', 'html', 'csv', 'json'];

interface Document {
    id?: string;
    name: string;
    extension: string;
    chunks: number;
    status: string;
    shared?: boolean;
    workspace_id?: string;
    workspace_name?: string;
    shared_with?: string[];
    size?: number | string;
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

export function KnowledgeBase({ workspaceId: propWorkspaceId = "default", isSidebar = false, isGlobal = false }: KnowledgeBaseProps) {
    const workspaceId = isGlobal ? "vault" : propWorkspaceId;
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_error, setError] = useState<string | null>(null);
    const { showError } = useError();
    const { activeTasks, recentCompletedTasks } = useTasks();
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string | null; download_url?: string } | null>(null);
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
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'arxiv' | 'github' | 'sitemap' | 'directory' | 'audio'>('file');
    const [importUrl, setImportUrl] = useState('');
    const [githubBranch, setGithubBranch] = useState('main');
    const [statusFilter, setStatusFilter] = useState('all');
    const [workspaceFilter, setWorkspaceFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState('all');

    // Detailed Management State
    const [detailsDoc, setDetailsDoc] = useState<any | null>(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
    const [confirmingAction, setConfirmingAction] = useState<{
        type: 'index' | 'de-index';
        workspace_id: string;
        workspace_name: string;
    } | null>(null);

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
                    document_id: doc.id,
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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement> | { file: File }) => {
        let file: File | undefined;
        if ('target' in e) {
            file = e.target.files?.[0];
        } else {
            file = e.file;
        }

        if (!file) return;

        // Validation: File Size
        if (file.size > MAX_FILE_SIZE) {
            showError("File Too Large", `File size must be under ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
            return;
        }

        // Validation: Extension
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            showError("Invalid File Type", `Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
            return;
        }

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
                setIsUploadModalOpen(false);
            } else {
                const payload = await res.json();
                let title = "Upload Failed";
                const message = payload.message || 'Upload failed';

                if (payload.code === 'VALIDATION_ERROR') {
                    title = "Validation Error";
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
            const errorMessage = err instanceof Error ? err.message : 'Failed to reach storage.';
            showError("Network Error", errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImport = async (type: string) => {
        if (!importUrl && type !== 'directory') return;

        // Validation: URL Format
        if (type === 'url' || type === 'sitemap' || type === 'github') {
            try {
                new URL(importUrl);
            } catch (e) {
                showError("Invalid URL", "Please provide a valid HTTP/HTTPS URL.");
                return;
            }
        }

        setIsUploading(true);
        try {
            let url = '';
            let body: any = { url: importUrl };

            switch (type) {
                case 'url':
                    url = API_ROUTES.DOCUMENTS + '/import-url';
                    break;
                case 'sitemap':
                    url = API_ROUTES.DOCUMENTS + '/import-sitemap';
                    break;
                case 'github':
                    url = API_ROUTES.DOCUMENTS + '/import-github';
                    body = { url: importUrl, branch: githubBranch };
                    break;
                case 'directory':
                    url = API_ROUTES.DOCUMENTS + '/import-directory';
                    body = { path: importUrl };
                    break;
                case 'arxiv':
                    url = API_ROUTES.UPLOAD + '-arxiv';
                    break;
                default: return;
            }

            const res = await fetch(`${url}?workspace_id=${encodeURIComponent(workspaceId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsUploadModalOpen(false);
                setImportUrl('');
                const payload = await res.json();
                if (payload.data?.duplicate?.is_duplicate) {
                    setDuplicateData({
                        id: payload.data.duplicate.existing_id,
                        name: payload.data.duplicate.existing_name,
                        workspace: payload.data.duplicate.original_workspace,
                        is_duplicate: true
                    });
                }
            } else {
                const payload = await res.json();
                showError("Import Failed", payload.message || 'Failed to start import', `Source: ${importUrl}`);
            }
        } catch (err) {
            showError("Network Error", "Could not connect to document service.");
        } finally {
            setIsUploading(false);
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
                    document_id: duplicateData.id,
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

    const handleDelete = async (id: string, vaultDelete: boolean = false) => {
        try {
            const url = new URL(API_ROUTES.DOCUMENT_DELETE(id));
            // FIXED: Use specific document workspace context to avoid 404 in Global view
            const targetWs = deletingDoc?.workspace_id || workspaceId;
            url.searchParams.append('workspace_id', targetWs);

            if (vaultDelete) {
                url.searchParams.append('vault_delete', 'true');
            }

            const res = await fetch(url.toString(), {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.id !== id));
                setDeletingDoc(null);
            } else {
                const payload = await res.json();
                showError("Operation Failed", payload.message || 'Document deletion failed.', `ID: ${id}`);
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
                    document_id: managingDoc.id,
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

    const handleView = async (id: string, name: string) => {
        setIsViewing(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_GET(id));
            if (res.ok) {
                const payload = await res.json();
                const data = payload.data;
                setActiveSource({
                    id: 0,
                    name: data.filename || name,
                    content: data.content,
                    download_url: data.download_url
                });
                fetchDocuments(); // Refresh status/fragments after on-demand indexing

            } else {
                const payload = await res.json();
                showError("Retrieval Failure", payload.message || 'Could not fetch document content.', `ID: ${id}`);
            }
        } catch (err) {
            console.error('Failed to view document', err);
            const errorMessage = err instanceof Error ? err.message : 'Connection error.';
            showError("Network Error", errorMessage);
        } finally {
            setIsViewing(false);
        }
    };

    const handleDetailView = async (doc: Document) => {
        setIsDetailsLoading(true);
        const docId = doc.id || doc.name;
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(docId)}/inspect`);
            if (res.ok) {
                const payload = await res.json();
                setDetailsDoc(payload.data);
            } else {
                showError("Inspect Failed", "Could not retrieve document relationships.");
            }
        } catch (err) {
            showError("Network Error", "Connection to metadata server failed.");
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const handleOpenWorkspaceManagement = async (doc: Document) => {
        setManagingDoc(doc);
        setIsWorkspaceModalOpen(true);
        // We also load details for this modal to show existing indexings
        handleDetailView(doc);
    };

    const formatSize = (size?: number | string) => {
        if (size === undefined || size === 'Unknown') return 'N/A';
        const bytes = typeof size === 'string' ? parseInt(size) : size;
        if (isNaN(bytes)) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                            <span className="text-tiny font-black   text-center px-4 leading-relaxed">System Index Empty</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-1 py-4 mt-2">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex-1 group flex items-center justify-center gap-3 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-gray-500 hover:text-indigo-400 transition-all text-tiny font-black  "
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        Add Documents
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-10 bg-[#121214] rounded-[2.5rem] h-full border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30" />

            {/* Unified Upload Modal */}
            <AnimatePresence>
                {isUploadModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsUploadModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white  tracking-tight">Add Documents</h4>
                                        <p className="text-tiny text-gray-500 font-bold  ">Choose a method to import content</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { id: 'file', label: 'Local File', icon: Upload },
                                        { id: 'url', label: 'Web URL', icon: Globe },
                                        { id: 'arxiv', label: 'ArXiv', icon: Network },
                                        { id: 'github', label: 'GitHub', icon: Github },
                                        { id: 'sitemap', label: 'Sitemap', icon: Link2 },
                                        { id: 'directory', label: 'Directory', icon: Folder },
                                        { id: 'audio', label: 'Audio', icon: Music },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setUploadMode(m.id as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                                                uploadMode === m.id ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                                            )}
                                        >
                                            <m.icon size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                    {uploadMode === 'file' && (
                                        <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-indigo-500/30 transition-all hover:bg-indigo-500/5 group">
                                            <Upload className="mb-4 text-gray-600 group-hover:text-indigo-400 transition-colors" size={32} />
                                            <span className="text-tiny font-bold text-gray-500 group-hover:text-gray-300">Choose a file to upload</span>
                                            <input type="file" className="hidden" onChange={handleUpload} />
                                        </label>
                                    )}

                                    {uploadMode !== 'file' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">
                                                    {uploadMode === 'arxiv' ? 'Paper ID or Link' : uploadMode === 'directory' ? 'Absolute Path' : 'URL Source'}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder={
                                                        uploadMode === 'arxiv' ? "e.g. 1706.03762" :
                                                            uploadMode === 'github' ? "https://github.com/..." :
                                                                uploadMode === 'directory' ? "/home/user/documents" :
                                                                    "https://example.com/..."
                                                    }
                                                    value={importUrl}
                                                    onChange={(e) => setImportUrl(e.target.value)}
                                                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 h-14 text-caption text-white focus:ring-2 ring-indigo-500/20 outline-none transition-all placeholder:text-gray-700 font-medium"
                                                />
                                            </div>

                                            {uploadMode === 'github' && (
                                                <div className="space-y-2">
                                                    <label className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">Branch</label>
                                                    <input
                                                        type="text"
                                                        value={githubBranch}
                                                        onChange={(e) => setGithubBranch(e.target.value)}
                                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 h-14 text-caption text-white focus:ring-2 ring-indigo-500/20 outline-none transition-all font-medium"
                                                    />
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleImport(uploadMode)}
                                                disabled={isUploading || (!importUrl && uploadMode !== 'directory')}
                                                className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-2xl font-black text-tiny tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                                            >
                                                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                                                START IMPORT
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                                        <h4 className="text-h3 font-black text-white  tracking-tight">Vault Browser</h4>
                                        <p className="text-tiny text-gray-500 font-bold  ">Select Intelligence to Link</p>
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
                                        <span className="text-tiny font-black text-gray-600  ">Scanning Vault...</span>
                                    </div>
                                ) : vaultDocuments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                        <Database size={48} className="text-gray-600" />
                                        <span className="text-tiny font-black text-gray-600  ">No Documents Found</span>
                                    </div>
                                ) : (
                                    vaultDocuments.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10">
                                                    <FileText size={18} className="text-gray-500 group-hover:text-indigo-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-caption font-bold text-white  tracking-tight">{doc.name}</span>
                                                    <span className="text-tiny text-gray-500  font-medium">{doc.extension?.replace('.', '')} • FROM {doc.workspace_name}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleLinkFromVault(doc)}
                                                disabled={isLinking}
                                                className="h-10 px-6 rounded-xl bg-white text-black hover:bg-gray-200 text-tiny font-black   transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
                                    <h2 className="text-h2 font-black text-white  ">Duplicate Found</h2>
                                    <p className="text-caption text-gray-500 font-medium leading-relaxed px-4">
                                        This document is already in the <span className="text-indigo-400 font-bold">Vault</span>.
                                        Would you like to link the existing record to this workspace instead of creating a duplicate?
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleConfirmLink}
                                        disabled={isLinking}
                                        className="w-full h-16 bg-white text-black hover:bg-gray-200 rounded-[1.5rem] font-black text-tiny  tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {isLinking ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={18} />}
                                        Link Existing Entry
                                    </button>
                                    <button
                                        onClick={() => setDuplicateData(null)}
                                        className="w-full h-16 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-[1.5rem] font-black text-tiny  tracking-[0.2em] transition-all"
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
                        <h3 className="text-h3 font-black text-white  tracking-tight">Vault</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-tiny font-bold text-gray-500  ">{documents.length} Documents</span>
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
                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3 gap-2">
                        <Filter size={14} className="text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent border-none text-tiny text-gray-400 focus:ring-0 outline-none cursor-pointer py-2 pr-8"
                        >
                            <option value="all" className="bg-[#121214]">All Status</option>
                            <option value="indexed" className="bg-[#121214]">Indexed</option>
                            <option value="uploaded" className="bg-[#121214]">Unindexed</option>
                            <option value="indexing" className="bg-[#121214]">Processing</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3 gap-2">
                        <FileText size={14} className="text-gray-500" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-transparent border-none text-tiny text-gray-400 focus:ring-0 outline-none cursor-pointer py-2 pr-8"
                        >
                            <option value="all" className="bg-[#121214]">All Types</option>
                            {Array.from(new Set(documents.map(d => d.extension?.toLowerCase()).filter(Boolean))).sort().map(ext => (
                                <option key={ext} value={ext} className="bg-[#121214]">{ext?.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3 gap-2">
                        <Shield size={14} className="text-gray-500" />
                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            className="bg-transparent border-none text-tiny text-gray-400 focus:ring-0 outline-none cursor-pointer py-2 pr-8"
                        >
                            <option value="all" className="bg-[#121214]">All Access</option>
                            <option value="private" className="bg-[#121214]">Private</option>
                            <option value="shared" className="bg-[#121214]">Shared</option>
                        </select>
                    </div>

                    {isGlobal && workspaces.length > 0 && (
                        <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3 gap-2">
                            <Layers size={14} className="text-gray-500" />
                            <select
                                value={workspaceFilter}
                                onChange={(e) => setWorkspaceFilter(e.target.value)}
                                className="bg-transparent border-none text-tiny text-gray-400 focus:ring-0 outline-none cursor-pointer py-2 pr-8"
                            >
                                <option value="all" className="bg-[#121214]">All Workspaces</option>
                                {workspaces.map(ws => (
                                    <option key={ws.id} value={ws.id} className="bg-[#121214]">{ws.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isGlobal && (
                        <button
                            onClick={() => {
                                fetchVaultDocuments();
                                setIsVaultBrowserOpen(true);
                            }}
                            className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95 text-tiny font-black  "
                        >
                            <Database size={14} />
                            From Vault
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch(`${API_BASE_URL}/documents/sync-workspaces`, { method: 'POST' });
                                    if (res.ok) {
                                        const data = await res.json();
                                        fetchDocuments();
                                        alert(`Reconciliation complete. Repaired ${data.data.repaired_direct} records.`);
                                    }
                                } catch (err) {
                                    console.error('Sync failed:', err);
                                }
                            }}
                            className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all font-black text-tiny tracking-widest flex items-center gap-2"
                            title="Reconcile orphaned links"
                        >
                            <Network size={16} />
                            SYNC VAULT
                        </button>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="h-12 px-8 rounded-2xl bg-white text-black hover:bg-gray-200 transition-all font-black text-tiny tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-white/10"
                        >
                            <Plus size={16} />
                            IMPORT
                        </button>
                    </div>
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
                        <div className="text-tiny font-black text-indigo-300 mb-1">Uploading and processing...</div>
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
                        const filtered = documents.filter(doc => {
                            const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                doc.workspace_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                doc.extension?.toLowerCase().includes(searchQuery.toLowerCase());

                            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter || (statusFilter === 'uploaded' && doc.status === 'uploaded');
                            const matchesWorkspace = workspaceFilter === 'all' || doc.workspace_id === workspaceFilter;
                            const matchesType = typeFilter === 'all' || doc.extension?.toLowerCase() === typeFilter.toLowerCase();
                            const matchesVisibility = visibilityFilter === 'all' ||
                                (visibilityFilter === 'private' && (!doc.shared_with || doc.shared_with.length === 0)) ||
                                (visibilityFilter === 'shared' && doc.shared_with && doc.shared_with.length > 0);

                            return matchesSearch && matchesStatus && matchesWorkspace && matchesType && matchesVisibility;
                        });

                        if (filtered.length === 0 && !isUploading) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center mb-6">
                                        <Search size={40} />
                                    </div>
                                    <h4 className="text-caption font-black mb-2">
                                        No Results
                                    </h4>
                                    <p className="text-tiny text-gray-500  font-bold ">
                                        Refine your filters or search terms
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
                                            className="text-caption font-black text-white truncate max-w-[400px]  tracking-tight"
                                            title={doc.name}
                                        >
                                            {doc.name}
                                        </span>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-tiny text-gray-600 ">{doc.extension?.replace('.', '') || 'File'}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                                            {doc.status === 'indexed' ? (
                                                <span className="text-tiny text-indigo-400/50 font-black  ">{doc.chunks} Fragments</span>
                                            ) : (
                                                <span className="text-tiny text-amber-400/50 font-black   flex items-center gap-2 uppercase tracking-widest">
                                                    {doc.status}
                                                </span>
                                            )}
                                            {isGlobal && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                    <span className="text-tiny px-2 py-0.5 rounded bg-white/5 text-gray-500  font-bold ">
                                                        {doc.workspace_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleView(doc.id!, doc.name)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"
                                        title="View Content"
                                    >
                                        {isViewing && activeSource?.name === doc.name ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleDetailView(doc)}
                                        className={cn(
                                            "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90",
                                            detailsDoc?.metadata?.filename === doc.name ? "bg-indigo-600 text-white shadow-lg" : "bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10"
                                        )}
                                        title="Document Details"
                                    >
                                        <Info size={18} />
                                    </button>

                                    {isGlobal && (
                                        <button
                                            onClick={() => handleOpenWorkspaceManagement(doc)}
                                            className={cn(
                                                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90",
                                                isWorkspaceModalOpen && managingDoc?.name === doc.name ? "bg-indigo-600 text-white shadow-lg" : "bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10"
                                            )}
                                            title="Workspace Indexing Management"
                                        >
                                            <ArrowRightLeft size={18} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setDeletingDoc(doc)}
                                        data-testid={`delete-doc-${doc.name}`}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                                        title="Delete Document"
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
                    <div className="flex items-center gap-2 text-tiny font-black text-emerald-500  ">
                        <Shield className="w-3 h-3" />
                        Indexed
                    </div>
                    <div className="flex items-center gap-2 text-tiny font-black text-blue-500  ">
                        <Filter className="w-3 h-3" />
                        Management Active
                    </div>
                </div>

                <Link
                    href="/"
                    className="text-tiny font-black  tracking-[0.2em] text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-2 group"
                >
                    System Protocol v1.4
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {detailsDoc && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setDetailsDoc(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Info size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white  tracking-tight">Document Details</h4>
                                        <p className="text-tiny text-gray-500 font-bold  ">Metadata & Indexing Relationships</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailsDoc(null)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Global Info */}
                                <section className="space-y-4">
                                    <h5 className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">Global Metadata</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Document ID', value: detailsDoc.metadata.id, icon: Database },
                                            { label: 'File Type', value: detailsDoc.metadata.content_type, icon: FileText },
                                            { label: 'File Size', value: formatSize(detailsDoc.metadata.size), icon: HardDrive },
                                            { label: 'Added On', value: new Date(detailsDoc.metadata.created_at).toLocaleDateString(), icon: Calendar },
                                        ].map((item, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-4">
                                                <div className="mt-1 text-gray-600"><item.icon size={16} /></div>
                                                <div>
                                                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{item.label}</div>
                                                    <div className="text-caption font-bold text-gray-300 mt-1 truncate">{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Internal Storage Root</div>
                                        <div className="text-tiny font-mono text-gray-500 mt-1 truncate">{detailsDoc.metadata.minio_path}</div>
                                    </div>
                                </section>

                                {/* Workspace Relationships */}
                                <section className="space-y-4">
                                    <h5 className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">Workspace Indexing</h5>
                                    <div className="space-y-3">
                                        {detailsDoc.relationships.length === 0 ? (
                                            <div className="p-8 text-center rounded-2xl border border-dashed border-white/5 text-gray-600 font-bold text-tiny">
                                                Not indexed in any workspace.
                                            </div>
                                        ) : (
                                            detailsDoc.relationships.map((rel: any, i: number) => (
                                                <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                                            rel.is_primary ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"
                                                        )}>
                                                            {rel.is_primary ? <Database size={18} /> : <ArrowRightLeft size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-tiny font-black text-white">{rel.workspace_name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={cn(
                                                                    "text-[10px] font-black uppercase tracking-widest",
                                                                    rel.status === 'indexed' ? "text-emerald-500/80" : "text-amber-500/80"
                                                                )}>{rel.status}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                                <span className="text-[10px] font-bold text-gray-600">{rel.chunks} Chunks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Last Sync</div>
                                                        <div className="text-tiny font-bold text-gray-500 mt-0.5">{new Date(rel.last_indexed).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Workspace Indexing Management Modal */}
            <AnimatePresence>
                {isWorkspaceModalOpen && managingDoc && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsWorkspaceModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <ArrowRightLeft size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-h3 font-black text-white  tracking-tight">Indexing Manager</h4>
                                        <p className="text-tiny text-gray-500 font-bold  ">Workspace Retrievability Controls</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsWorkspaceModalOpen(false)}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Current Workspace Indexes */}
                                <section className="space-y-4">
                                    <h5 className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">Active Indices</h5>
                                    <div className="space-y-3">
                                        {isDetailsLoading ? (
                                            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-gray-600" /></div>
                                        ) : detailsDoc?.relationships.length === 0 ? (
                                            <div className="p-6 text-center rounded-2xl border border-dashed border-white/5 text-gray-600 font-bold text-[11px]">No active workspace indices found.</div>
                                        ) : (
                                            detailsDoc?.relationships.map((rel: any, i: number) => (
                                                <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                                                            <Database size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-tiny font-black text-white">{rel.workspace_name}</div>
                                                            <div className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-wider">{rel.is_primary ? 'Primary Index' : 'Shared Reference'}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setConfirmingAction({ type: 'de-index', workspace_id: rel.workspace_id, workspace_name: rel.workspace_name })}
                                                        className="h-10 px-4 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Remove Index
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>

                                {/* Add to Workspace */}
                                <section className="space-y-4">
                                    <h5 className="text-tiny font-black text-gray-500 uppercase tracking-widest ml-1">New Workspace Exposure</h5>
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Select Target Workspace</label>
                                            <div className="relative group">
                                                <select
                                                    value={shareTarget}
                                                    onChange={(e) => setShareTarget(e.target.value)}
                                                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 h-14 text-caption text-white focus:ring-2 ring-indigo-500/20 outline-none appearance-none cursor-pointer transition-all hover:border-white/20 font-medium"
                                                >
                                                    <option value="" disabled className="bg-[#121214]">Choose destination...</option>
                                                    {workspaces.map((ws) => (
                                                        <option key={ws.id} value={ws.id} className="bg-[#121214]">{ws.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none group-hover:text-gray-400 transition-colors" size={16} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const ws = workspaces.find(w => w.id === shareTarget);
                                                if (ws) setConfirmingAction({ type: 'index', workspace_id: ws.id, workspace_name: ws.name });
                                            }}
                                            disabled={!shareTarget || isManaging}
                                            className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-2xl font-black text-tiny tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            <Plus size={16} />
                                            ADD INDEXING
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Explicit Confirmation Modal */}
            <AnimatePresence>
                {confirmingAction && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                            onClick={() => setConfirmingAction(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className={cn(
                                    "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-2",
                                    confirmingAction.type === 'index' ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-500"
                                )}>
                                    {confirmingAction.type === 'index' ? <Zap size={40} /> : <AlertTriangle size={40} />}
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-h2 font-black text-white tracking-tight">
                                        {confirmingAction.type === 'index' ? 'Add Workspace Index' : 'Remove Workspace Index'}
                                    </h2>

                                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 text-left">
                                        <div className="space-y-2">
                                            <h6 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Consequences</h6>
                                            <ul className="space-y-3">
                                                {confirmingAction.type === 'index' ? (
                                                    <>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-indigo-400"><Plus size={12} /></div>
                                                            Create dedicated vectors for workspace '{confirmingAction.workspace_name}'.
                                                        </li>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-indigo-400"><Plus size={12} /></div>
                                                            Consume background compute resources for processing.
                                                        </li>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-indigo-400"><Plus size={12} /></div>
                                                            Enable retrieval and chat context for this document in target workspace.
                                                        </li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-red-400"><Trash2 size={12} /></div>
                                                            Remove from search and retrieval in workspace '{confirmingAction.workspace_name}'.
                                                        </li>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-red-400"><Trash2 size={12} /></div>
                                                            Delete all workspace-specific vector fragments and metadata.
                                                        </li>
                                                        <li className="flex gap-3 text-tiny text-gray-300 font-bold leading-snug">
                                                            <div className="mt-1 text-amber-400"><AlertTriangle size={12} /></div>
                                                            Existing RAG flows in this workspace will lose access to this source.
                                                        </li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                                Note: Global document existence (MinIO storage) will NOT be affected.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                    <button
                                        onClick={() => setConfirmingAction(null)}
                                        className="h-14 rounded-2xl bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white transition-all font-black text-tiny tracking-widest"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!managingDoc) return;
                                            setIsManaging(true);
                                            try {
                                                if (confirmingAction.type === 'index') {
                                                    // Start indexing via orchestration to handle existence logic
                                                    const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            document_id: managingDoc.id,
                                                            target_workspace_id: confirmingAction.workspace_id,
                                                            action: 'link'
                                                        })
                                                    });
                                                    if (res.ok) {
                                                        setConfirmingAction(null);
                                                        setIsWorkspaceModalOpen(false);
                                                        fetchDocuments();
                                                    } else {
                                                        showError("Action Failed", "Could not initiate indexing.");
                                                    }
                                                } else {
                                                    // Remove index
                                                    const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(managingDoc.id!)}?workspace_id=${encodeURIComponent(confirmingAction.workspace_id)}&vault_delete=false`, {
                                                        method: 'DELETE'
                                                    });
                                                    if (res.ok) {
                                                        setConfirmingAction(null);
                                                        handleDetailView(managingDoc); // Refresh details within modal
                                                        fetchDocuments();
                                                    } else {
                                                        showError("Action Failed", "Could not remove index.");
                                                    }
                                                }
                                            } catch (err) {
                                                showError("Network Error", "Communication failure.");
                                            } finally {
                                                setIsManaging(false);
                                            }
                                        }}
                                        disabled={isManaging}
                                        className={cn(
                                            "h-14 rounded-2xl font-black text-tiny tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                            confirmingAction.type === 'index' ? "bg-white text-black hover:bg-gray-200" : "bg-red-500 text-white hover:bg-red-400 shadow-xl shadow-red-500/20"
                                        )}
                                    >
                                        {isManaging ? <Loader2 className="animate-spin" size={16} /> : (confirmingAction.type === 'index' ? <Plus size={16} /> : <Trash2 size={16} />)}
                                        CONFIRM
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
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
                                <h4 className="text-h3 font-black text-white   mb-2">Destructive Operation Pending</h4>
                                <p className="text-tiny text-gray-500 leading-relaxed max-w-[280px] mx-auto font-medium mb-10">
                                    Please specify the scope of removal for <span className="text-white font-bold">{deletingDoc.name}</span>.
                                </p>

                                <div className="space-y-6 mb-10 text-left px-4">
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                                        <h6 className="text-[10px] font-black text-white uppercase tracking-widest">Option A: Workspace Removal</h6>
                                        <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                                            Removes this document from the current workspace search index. The actual file remains in storage and other workspace links are preserved.
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-3">
                                        <h6 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Option B: Global Deletion</h6>
                                        <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                                            Permanently deletes the file from MinIO storage and wipes all vector indices across <span className="text-red-400 font-bold uppercase">all</span> workspaces. This cannot be undone.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => handleDelete(deletingDoc.id!)}
                                        className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-tiny font-black tracking-widest"
                                    >
                                        REMOVE FROM WORKSPACE ONLY
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deletingDoc.id!, true)}
                                        data-testid="confirm-purge-btn"
                                        className="w-full py-5 rounded-2xl bg-red-500 text-white hover:bg-red-400 transition-all text-tiny font-black tracking-widest shadow-xl shadow-red-500/20"
                                    >
                                        DELETE FROM ENTIRE SYSTEM
                                    </button>
                                    <button
                                        onClick={() => setDeletingDoc(null)}
                                        className="w-full py-5 text-tiny text-gray-500 font-black hover:text-white transition-colors tracking-widest"
                                    >
                                        CANCEL ACTION
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
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
