'use client';

import { api } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Trash2, Loader2,
    Database, Search, Eye, Sparkles,
    Plus, Filter, Shield, ArrowRight, AlertTriangle,
    X, Globe, Link2, Github, Music, Info,
    ArrowRightLeft, Layers, Zap, HardDrive, Calendar, Cpu
} from 'lucide-react';
import { API_ROUTES, API_BASE_URL } from '@/lib/api-config';
import { Modal } from '@/components/ui/modal';
import { SourceViewer } from '@/components/source-viewer';
import { WorkspaceWizard } from "@/components/workspace/WorkspaceWizard";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useError } from '@/context/error-context';
import { getIllegalCharsFound } from '@/lib/constants';
import { useTasks } from '@/context/task-context';
import { useToast } from '@/context/toast-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    workspace_statuses?: Record<string, string>;
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

interface DocDetails {
    metadata: {
        id: string;
        filename: string;
        content_type: string;
        size: number | string;
        created_at: string;
        minio_path: string;
    };
    relationships: Array<{
        workspace_id: string;
        workspace_name: string;
        is_primary: boolean;
        status: string;
        chunks: number;
        embedding_dim: number;
        model: string;
        last_indexed: string;
        type?: 'shared_ref' | 'primary';
    }>;
}

export interface KnowledgeBaseActions {
    openUpload: () => void;
}

interface KnowledgeBaseProps {
    workspaceId?: string;
    isSidebar?: boolean;
    isGlobal?: boolean;
    onActionsReady?: (actions: KnowledgeBaseActions) => void;
}

export function KnowledgeBase({ workspaceId: propWorkspaceId = "default", isSidebar = false, isGlobal = false, onActionsReady }: KnowledgeBaseProps) {
    const workspaceId = isGlobal ? "vault" : propWorkspaceId;
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { showError } = useError();
    const toast = useToast();
    const { recentCompletedTasks } = useTasks();
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string | null; download_url?: string } | null>(null);
    const [shareTarget, setShareTarget] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
    const [managingDoc, setManagingDoc] = useState<Document | null>(null);
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
    const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
    const [importUrl, setImportUrl] = useState('');
    const [githubBranch, setGithubBranch] = useState('main');
    const [statusFilter, setStatusFilter] = useState('all');
    const [workspaceFilter, setWorkspaceFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState('all');

    // Detailed Management State
    const [detailsDoc, setDetailsDoc] = useState<DocDetails | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
    const [confirmingAction, setConfirmingAction] = useState<{
        type: 'index' | 'de-index';
        workspace_id: string;
        workspace_name: string;
    } | null>(null);
    const [deleteTargetWs, setDeleteTargetWs] = useState<string>('');



    // Poll for active tasks
    const fetchDocuments = React.useCallback(async () => {
        try {
            let payload;
            if (isGlobal) {
                payload = await api.listVaultDocumentsWorkspacesWorkspaceIdVaultGet({
                    workspaceId: workspaceId!
                });
            } else {
                payload = await api.listDocumentsWorkspacesWorkspaceIdDocumentsGet({ workspaceId });
            }

            const data: BackendDocument[] = payload.data || [];
            const mappedDocs = data.map((doc) => ({
                ...doc,
                name: doc.filename,
                shared: !isGlobal && doc.workspace_id !== workspaceId,
                workspace_name: doc.workspace_name || doc.workspace_id
            }));
            setDocuments(mappedDocs);
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    }, [isGlobal, workspaceId]);

    // Expose actions to parent (e.g. Vault header buttons)
    useEffect(() => {
        if (onActionsReady) {
            onActionsReady({
                openUpload: () => setIsUploadModalOpen(true),
            });
        }
    }, [onActionsReady, fetchDocuments]);

    const fetchVaultDocuments = async () => {
        setIsVaultLoading(true);
        try {
            const payload = await api.listVaultDocumentsWorkspacesWorkspaceIdVaultGet({
                workspaceId: workspaceId!
            });
            const data: BackendDocument[] = payload.data || [];
            const mappedDocs = data.map((doc) => ({
                ...doc,
                name: doc.filename,
                workspace_name: doc.workspace_name || doc.workspace_id
            }));
            // Filter out documents already in this workspace
            const filtered = mappedDocs.filter(vd =>
                !documents.some(d => d.name === vd.name)
            );
            setVaultDocuments(filtered);
        } catch (err) {
            console.error('Failed to fetch vault', err);
        } finally {
            setIsVaultLoading(false);
        }
    };

    const handleLinkFromVault = async (doc: Document) => {
        // Fire-and-forget: submit and close modal immediately
        try {
            await api.updateDocumentWorkspacesWorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
                workspaceId,
                documentWorkspaceUpdate: {
                    documentId: doc.id!,
                    targetWorkspaceId: workspaceId,
                    action: 'link',
                    forceReindex: false
                }
            });
            setIsVaultBrowserOpen(false);
        } catch (_err) {
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
                const payload = await api.listWorkspacesWorkspacesGet();
                setWorkspaces(payload.data || []);
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

        const formData = new FormData();
        formData.append('file', file);

        try {
            const payload = await api.uploadDocumentWorkspacesWorkspaceIdUploadPost({
                workspaceId,
                file: file
            });

            // Handle duplicate detection redirect if supported by backend return types
            // For now just show success as the job handle is returned
            setIsUploadModalOpen(false);
            toast.success('Document uploaded successfully');
        } catch (err: any) {
            let title = "Upload Failed";
            let message = "Upload failed";
            try {
                const payload = await err.response.json();
                message = payload.message || message;
                if (payload.code === 'DUPLICATE_DETECTED' && payload.data) {
                    setDuplicateData({
                        id: payload.data.existing_doc?.id,
                        name: payload.data.existing_doc?.filename,
                        workspace: payload.data.existing_doc?.workspace,
                        is_duplicate: true
                    });
                    return;
                }
            } catch (e) { }
            showError(title, message, `File: ${file.name}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImport = async (type: string) => {
        if (!importUrl) return;

        // Validation: URL Format
        if (type === 'url' || type === 'sitemap' || type === 'github') {
            try {
                new URL(importUrl);
            } catch (_e) {
                showError("Invalid URL", "Please provide a valid HTTP/HTTPS URL.");
                return;
            }
        }

        setIsUploading(true);
        try {
            let payload;
            if (importUrl.includes('github.com')) {
                payload = await api.importGithubDocumentWorkspacesWorkspaceIdImportGithubPost({
                    workspaceId,
                    gitHubImportRequest: { url: importUrl, branch: githubBranch }
                });
            } else if (importUrl.toLowerCase().endsWith('.xml') || importUrl.toLowerCase().includes('sitemap')) {
                payload = await api.importSitemapDocumentWorkspacesWorkspaceIdImportSitemapPost({
                    workspaceId,
                    sitemapImportRequest: { url: importUrl }
                });
            } else {
                payload = await api.importUrlDocumentWorkspacesWorkspaceIdImportUrlPost({
                    workspaceId,
                    urlImportRequest: { url: importUrl }
                });
            }

            setIsUploadModalOpen(false);
            setImportUrl('');
            toast.success('Import task started successfully');
        } catch (err: any) {
            try {
                const payload = await err.response.json();
                showError("Import Failed", payload.message || 'Failed to start import', `Source: ${importUrl}`);
            } catch (e) {
                showError("Network Error", "Could not connect to document service.");
            }
        } finally {
            setIsUploading(false);
        }
    };


    const handleConfirmLink = async () => {
        if (!duplicateData) return;
        const toastId = toast.loading(`Linking ${duplicateData.name}...`);
        setDuplicateData(null); // Close modal immediately

        try {
            await api.updateDocumentWorkspacesWorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
                workspaceId,
                documentWorkspaceUpdate: {
                    documentId: duplicateData.id,
                    targetWorkspaceId: workspaceId,
                    action: 'link',
                    forceReindex: false
                }
            });

            toast.dismiss(toastId);
            toast.success(`Successfully linked ${duplicateData.name}`);
            fetchDocuments();
        } catch (err: any) {
            toast.dismiss(toastId);
            try {
                const payload = await err.response.json();
                toast.error(`Link Failed: ${payload.message || 'Could not link document'}`);
            } catch (e) {
                toast.error("Network Error: Transmission interrupted.");
            }
        }
    };

    const handleDelete = async (id: string, vaultDelete: boolean = false) => {
        const docName = deletingDoc?.name || "document";
        const toastId = toast.loading(`${vaultDelete ? 'Purging' : 'Removing'} ${docName}...`);
        setDeletingDoc(null); // Close modal immediately

        try {
            const targetWs = deleteTargetWs || deletingDoc?.workspace_id || workspaceId;
            await api.deleteDocumentWorkspacesWorkspaceIdDocumentsDocumentIdDelete({
                documentId: id,
                workspaceId: targetWs,
                vaultDelete
            });
            toast.dismiss(toastId);
            toast.success(`${docName} ${vaultDelete ? 'purged globally' : 'removed from workspace'}`);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
        } catch (err: any) {
            toast.dismiss(toastId);
            try {
                const payload = await err.response.json();
                toast.error(`${docName} delete failed: ${payload.message || 'Operation failed'}`);
            } catch (e) {
                toast.error(`Network error while deleting ${docName}`);
            }
        }
    };



    const handleView = async (id: string, name: string) => {
        try {
            const payload = await api.getDocumentWorkspacesWorkspaceIdDocumentsDocumentIdGet({
                documentId: id,
                workspaceId
            });
            const data = payload.data;
            setActiveSource({
                id: 0,
                name: data.filename || name,
                content: data.content,
                download_url: data.download_url
            });
            fetchDocuments(); // Refresh status/fragments after on-demand indexing

        } catch (err: any) {
            console.error('Failed to view document', err);
            try {
                const payload = await err.response.json();
                showError("Retrieval Failure", payload.message || 'Could not fetch document content.', `ID: ${id}`);
            } catch (e) {
                showError("Network Error", 'Connection error.');
            }
        }
    };

    const handleDetailView = async (doc: Document, showModal = true) => {
        setIsDetailsLoading(true);
        if (showModal) setIsDetailsModalOpen(true);
        const docId = doc.id || doc.name;
        try {
            const payload = await api.inspectDocumentWorkspacesWorkspaceIdDocumentsDocumentIdInspectGet({
                documentId: docId,
                workspaceId
            });
            setDetailsDoc(payload.data);
        } catch (_err) {
            showError("Inspect Failed", "Could not retrieve document relationships.");
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const handleOpenWorkspaceManagement = async (doc: Document) => {
        setManagingDoc(doc);
        setIsWorkspaceModalOpen(true);
        // We also load details for this modal to show existing indexings, but we don't want the details modal itself to open
        handleDetailView(doc, false);
    };

    const formatSize = (size?: number | string) => {
        if (size === undefined || size === 'Unknown') return 'N/A';
        const bytes = typeof size === 'string' ? parseInt(size) : size;
        if (isNaN(bytes)) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };



    if (isSidebar) {
        return (
            <div className="flex flex-col gap-3 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                    {documents.map((doc) => (
                        <div
                            key={doc.id || `${doc.name}-${doc.workspace_id}`}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-all relative border border-transparent hover:border-border"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={14} className="text-muted-foreground shrink-0 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-tiny text-muted-foreground truncate font-medium">{doc.name}</span>
                            </div>
                            <button
                                onClick={() => setDeletingDoc(doc)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all active:scale-90"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {documents.length === 0 && !isUploading && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                            <Database size={24} className="mb-2 text-muted-foreground" />
                            <span className="text-tiny font-black text-muted-foreground text-center px-4 leading-relaxed">System Index Empty</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-1 py-4 mt-2">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex-1 group flex items-center justify-center gap-3 h-10 rounded-xl bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-indigo-500 transition-all text-tiny font-black"
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        Add Documents
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 bg-transparent h-full overflow-hidden relative">

            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <Upload size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground leading-none">Ingestion Portal</span>
                            <span className="text-[9px] text-muted-foreground font-black tracking-widest mt-1 opacity-60">Source Data Import</span>
                        </div>
                    </div>
                )}
                className="max-w-2xl"
                containerClassName="p-0"
            >
                <div className="flex flex-col h-[550px]">
                    <div className="flex-1 overflow-y-auto px-10 pt-6 space-y-8 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'file', label: 'Local Artifact', icon: Upload, desc: 'Direct upload from filesystem' },
                                { id: 'link', label: 'External Node', icon: Globe, desc: 'Import via HTTPS / Public URL' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setUploadMode(m.id as 'file' | 'link')}
                                    className={cn(
                                        "flex flex-col items-start p-6 rounded-[2rem] border transition-all gap-3 group relative overflow-hidden",
                                        uploadMode === m.id
                                            ? "bg-indigo-500/5 border-indigo-500/30 text-indigo-500 shadow-xl shadow-indigo-500/5"
                                            : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/60"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                                        uploadMode === m.id ? "bg-indigo-500 border-indigo-400 text-white" : "bg-background border-border"
                                    )}>
                                        <m.icon size={20} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] font-black tracking-widest text-foreground block">{m.label}</span>
                                        <span className="text-[9px] font-medium opacity-60">{m.desc}</span>
                                    </div>
                                    {uploadMode === m.id && (
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-secondary/20 border border-border space-y-6">
                            {uploadMode === 'file' && (
                                <label className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-border rounded-[2rem] cursor-pointer hover:border-indigo-500/30 transition-all hover:bg-indigo-500/5 group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Upload className="mb-4 text-muted-foreground/40 group-hover:text-indigo-500 transition-all group-hover:scale-110" size={40} />
                                    <div className="text-center space-y-1 relative">
                                        <span className="text-xs font-black text-foreground tracking-widest block">Drop Material Here</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">PDF, TXT, MD, DOCX, HTML, CSV, JSON</span>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleUpload} />
                                </label>
                            )}

                            {uploadMode !== 'file' && (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-muted-foreground tracking-[0.3em] ml-1">
                                            Resource Identifier (URL)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="https://content-source.com/artifact..."
                                                value={importUrl}
                                                onChange={(e) => setImportUrl(e.target.value)}
                                                className="w-full bg-background border border-border rounded-2xl px-6 h-14 text-[11px] text-foreground focus:ring-2 ring-indigo-500/20 outline-none transition-all placeholder:text-muted-foreground/20 font-bold"
                                            />
                                            <Link2 size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                                        </div>
                                    </div>

                                    {importUrl.includes('github.com') && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2">
                                            <label className="text-[9px] font-black text-muted-foreground tracking-[0.3em] ml-1">Repository Branch</label>
                                            <input
                                                type="text"
                                                value={githubBranch}
                                                onChange={(e) => setGithubBranch(e.target.value)}
                                                className="w-full bg-background border border-border rounded-2xl px-6 h-12 text-[11px] text-foreground focus:ring-2 ring-indigo-500/20 outline-none transition-all font-bold"
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleImport('link')}
                                        disabled={isUploading || !importUrl}
                                        className="w-full h-14 bg-indigo-500 text-white hover:bg-indigo-600 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50 mt-4 shadow-xl shadow-indigo-500/20"
                                    >
                                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                        START INGESTION
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isVaultBrowserOpen}
                onClose={() => setIsVaultBrowserOpen(false)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <Database size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground leading-none">Vault Browser</span>
                            <span className="text-[9px] text-muted-foreground font-black tracking-widest mt-1 opacity-60">Global Asset Discovery</span>
                        </div>
                    </div>
                )}
                className="max-w-2xl"
                containerClassName="p-0"
            >
                <div className="flex flex-col h-[550px]">
                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {isVaultLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/5 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-[2rem] border border-indigo-500/20 animate-pulse" />
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground tracking-[0.3em]">Mapping Cold Storage...</span>
                            </div>
                        ) : vaultDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-20">
                                <div className="w-20 h-20 rounded-[2rem] bg-secondary border border-border flex items-center justify-center">
                                    <Database size={32} className="text-muted-foreground" />
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">Matrix Empty</span>
                            </div>
                        ) : (
                            vaultDocuments.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-secondary/30 border border-border hover:border-indigo-500/30 transition-all group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-indigo-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-5 relative">
                                        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                            <FileText size={20} className="text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-foreground tracking-tight group-hover:text-indigo-400 transition-colors">{doc.name}</span>
                                            <span className="text-[9px] text-muted-foreground font-black tracking-widest mt-0.5 opacity-60">
                                                {doc.extension?.replace('.', '') || 'UNKNOWN'} • ORIGIN: {doc.workspace_name || 'SYSTEM'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleLinkFromVault(doc)}
                                        disabled={isLinking}
                                        className="h-10 px-6 rounded-xl bg-foreground text-background hover:opacity-90 text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center gap-2 relative"
                                    >
                                        {isLinking ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Deploy
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!duplicateData}
                onClose={() => setDuplicateData(null)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <AlertTriangle size={16} />
                        </div>
                        <span className="text-indigo-500">Asset Conflict</span>
                    </div>
                )}
                className="max-w-md"
            >
                <div className="p-4 text-center space-y-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/5 flex items-center justify-center mx-auto border border-indigo-500/10">
                        <Database size={32} className="text-indigo-500/40" />
                    </div>
                    <div className="space-y-3 px-4">
                        <p className="text-xs font-bold text-foreground tracking-widest">Duplicate Detected</p>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            This artifact already exists within the <span className="text-indigo-500 font-bold">Global Knowledge Vault</span>.
                            Deploy the existing entry to this node instead of creating a redundant copy?
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleConfirmLink}
                            disabled={isLinking}
                            className="w-full h-14 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20"
                        >
                            {isLinking ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={16} />}
                            Link Existing Entry
                        </button>
                        <button
                            onClick={() => setDuplicateData(null)}
                            className="w-full h-14 bg-secondary text-muted-foreground hover:text-foreground rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all border border-border hover:border-indigo-500/30"
                        >
                            Continue with New Asset
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Header and Primary Actions — hidden when isGlobal (Vault page renders them in its own header) */}
            {!isGlobal && (
                <div className="flex items-center justify-end mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                fetchVaultDocuments();
                                setIsVaultBrowserOpen(true);
                            }}
                            className="h-10 px-4 flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-500 transition-all active:scale-95 text-xs font-bold"
                        >
                            <Database size={14} />
                            Add from Vault
                        </button>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="h-10 px-6 rounded-xl bg-foreground text-background hover:opacity-90 transition-all font-bold text-xs flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={16} />
                            Upload
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground focus:outline-none focus:ring-2 ring-indigo-500/20 focus:bg-muted transition-all placeholder:text-muted-foreground/50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {!isGlobal && (
                        <div className="flex items-center gap-1 group/select">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <div className="flex items-center gap-1.5">
                                        <Filter size={14} className="text-muted-foreground group-hover/select:text-indigo-500 transition-colors" />
                                        <SelectValue placeholder="All Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="ingested">Ingested</SelectItem>
                                    <SelectItem value="uploaded">Uploaded</SelectItem>
                                    <SelectItem value="verifying">Verifying</SelectItem>
                                    <SelectItem value="embedding">Embedding</SelectItem>
                                    <SelectItem value="reading">Reading</SelectItem>
                                    <SelectItem value="ingesting">Ingesting</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex items-center gap-1 group/select">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[130px]">
                                <div className="flex items-center gap-1.5">
                                    <FileText size={14} className="text-muted-foreground group-hover/select:text-indigo-500 transition-colors" />
                                    <SelectValue placeholder="All Types" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {Array.from(new Set(documents.map(d => d.extension?.toLowerCase()).filter(Boolean))).sort().map(ext => (
                                    <SelectItem key={ext} value={ext!}>{ext?.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!isGlobal && (
                        <div className="flex items-center gap-1 group/select">
                            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                                <SelectTrigger className="w-[130px]">
                                    <div className="flex items-center gap-1.5">
                                        <Shield size={14} className="text-muted-foreground group-hover/select:text-indigo-500 transition-colors" />
                                        <SelectValue placeholder="All Access" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Access</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                    <SelectItem value="shared">Shared</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {isGlobal && workspaces.length > 0 && (
                        <div className="flex items-center gap-1 group/select">
                            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <div className="flex items-center gap-1.5">
                                        <Layers size={14} className="text-muted-foreground group-hover/select:text-indigo-500 transition-colors" />
                                        <SelectValue placeholder="All Workspaces" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Workspaces</SelectItem>
                                    {workspaces.map(ws => (
                                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {isUploading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/20"
                >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                    <div className="flex-1">
                        <div className="text-tiny font-black text-indigo-300 mb-1">Uploading and processing...</div>
                        <div className="w-full bg-indigo-500/10 h-1 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-indigo-500"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {(() => {
                        const filtered = documents.filter(doc => {
                            const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                doc.workspace_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                doc.extension?.toLowerCase().includes(searchQuery.toLowerCase());

                            const effectiveStatus = doc.workspace_statuses?.[workspaceId] || doc.status;
                            const matchesStatus = isGlobal || statusFilter === 'all' ||
                                effectiveStatus === statusFilter ||
                                (statusFilter === 'ingested' && effectiveStatus === 'indexed');
                            const matchesWorkspace = workspaceFilter === 'all' || doc.workspace_id === workspaceFilter;
                            const matchesType = typeFilter === 'all' || doc.extension?.toLowerCase() === typeFilter.toLowerCase();
                            const matchesVisibility = isGlobal || visibilityFilter === 'all' ||
                                (visibilityFilter === 'private' && (!doc.shared_with || doc.shared_with.length === 0)) ||
                                (visibilityFilter === 'shared' && doc.shared_with && doc.shared_with.length > 0);

                            return matchesSearch && matchesStatus && matchesWorkspace && matchesType && matchesVisibility;
                        });

                        if (filtered.length === 0 && !isUploading) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-secondary border border-border flex items-center justify-center mb-6">
                                        <Search size={40} className="text-muted-foreground" />
                                    </div>
                                    <h4 className="text-caption font-black mb-2 text-foreground">
                                        No Results
                                    </h4>
                                    <p className="text-tiny text-muted-foreground font-bold">
                                        Refine your filters or search terms
                                    </p>
                                </div>
                            );
                        }

                        return filtered.map((doc) => (
                            <div
                                key={doc.id || `${doc.name}-${doc.workspace_id}`}
                                className="group flex items-center justify-between py-4 border-b border-border hover:bg-secondary/20 transition-all px-2 overflow-hidden"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center border border-border group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all shrink-0">
                                        <FileText className="w-5 h-5 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-foreground truncate max-w-[280px] tracking-tight">{doc.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-muted-foreground tracking-[0.15em]">{doc.extension?.replace('.', '') || 'File'}</span>
                                            {(() => {
                                                const effectiveStatus = doc.workspace_statuses?.[workspaceId] || doc.status;
                                                const isIngested = effectiveStatus === 'ingested' || effectiveStatus === 'indexed';

                                                return (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        {isIngested && !isGlobal ? (
                                                            <span className="text-[10px] text-emerald-400 font-black tracking-widest flex items-center gap-1.5">
                                                                <Shield className="w-2.5 h-2.5" />
                                                                {doc.chunks || 0} Fragments
                                                            </span>
                                                        ) : (
                                                            <span className={cn(
                                                                "text-[10px] font-black flex items-center gap-2 tracking-widest",
                                                                effectiveStatus === 'failed' ? "text-red-500" :
                                                                    isGlobal ? "text-indigo-500" :
                                                                        effectiveStatus === 'embedding' || effectiveStatus === 'indexing' || effectiveStatus === 'ingesting' ? "text-indigo-500 animate-pulse" :
                                                                            effectiveStatus === 'reading' ? "text-indigo-500 animate-pulse" :
                                                                                "text-amber-500 animate-pulse"
                                                            )}>
                                                                {isGlobal ? 'Uploaded' : (effectiveStatus === 'uploaded' ? 'Pending Index' : effectiveStatus)}
                                                            </span>
                                                        )}
                                                        {isGlobal && doc.workspace_name && doc.workspace_name !== 'Unknown' && doc.workspace_name !== 'Unknown Workspace' && doc.workspace_id !== 'vault' && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                                <span className="text-[10px] text-muted-foreground font-bold tracking-tight">{doc.workspace_name}</span>
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">

                                    <button
                                        onClick={() => handleView(doc.id!, doc.name)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                                        title="View Content"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDetailView(doc)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                        title="Details"
                                    >
                                        <Info size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleOpenWorkspaceManagement(doc)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                        title="Manage"
                                    >
                                        <ArrowRightLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingDoc(doc);
                                            setDeleteTargetWs(workspaceId === 'vault' ? (doc.workspace_id || '') : workspaceId);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ));
                    })()}
                </AnimatePresence>
            </div>

            {!isGlobal && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                            <Shield className="w-3 h-3" />
                            Indexed
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {/* Remade Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setDetailsDoc(null);
                }}
                title={(
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-500 tracking-[0.2em] uppercase">
                                Document Profile
                            </div>
                            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 tracking-[0.2em] uppercase">
                                {detailsDoc?.metadata.content_type.split('/')[1] || 'FILE'}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight leading-none break-all">
                            {detailsDoc?.metadata.filename}
                        </h2>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold">
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-indigo-500/40" />
                                {detailsDoc && new Date(detailsDoc.metadata.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <HardDrive size={12} className="text-indigo-500/40" />
                                {detailsDoc && formatSize(detailsDoc.metadata.size)}
                            </div>
                        </div>
                    </div>
                )}
                className="max-w-2xl"
                containerClassName="p-0"
            >
                <div className="flex flex-col max-h-[70vh]">
                    <div className="flex-1 overflow-y-auto px-10 pb-10 pt-4 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h5 className="text-[10px] font-black text-muted-foreground tracking-widest">Search indices</h5>
                                    <span className="text-[10px] font-bold text-gray-500">{detailsDoc?.relationships.length || 0} location(s)</span>
                                </div>

                                <div className="space-y-4">
                                    {!detailsDoc || detailsDoc.relationships.length === 0 ? (
                                        <div className="py-12 text-center rounded-[2rem] border border-dashed border-border/50 text-muted-foreground font-bold text-tiny bg-secondary/10">
                                            This file is stored but not yet indexed for search.
                                        </div>
                                    ) : (
                                        detailsDoc.relationships.map((rel, i) => (
                                            <div
                                                key={i}
                                                className="group relative p-6 rounded-[2rem] bg-secondary/30 border border-border hover:border-indigo-500/30 transition-all overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />

                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                                                            rel.is_primary
                                                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
                                                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                        )}>
                                                            {rel.is_primary ? <Database size={20} /> : <ArrowRightLeft size={20} />}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="text-xs font-black text-foreground tracking-tight">
                                                                {rel.workspace_name}
                                                                {rel.type === 'shared_ref' && (
                                                                    <span className="ml-2 py-0.5 px-2 rounded-md bg-emerald-500/10 text-[8px] text-emerald-500 tracking-widest font-black">Shared</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers size={10} className="text-muted-foreground/40" />
                                                                    <span className="text-[10px] font-bold text-muted-foreground">{rel.chunks} Chunks</span>
                                                                </div>
                                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                                <div className="flex items-center gap-2">
                                                                    <Cpu size={10} className="text-muted-foreground/40" />
                                                                    <span className="text-[10px] font-bold text-muted-foreground">{rel.embedding_dim} Dims</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right space-y-1">
                                                        <div className={cn(
                                                            "text-[9px] font-black tracking-[0.2em]",
                                                            rel.status === 'ingested' || rel.status === 'indexed' ? "text-emerald-500" : "text-amber-500"
                                                        )}>
                                                            <span className="animate-pulse">●</span> {rel.status}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-muted-foreground/60">
                                                            {rel.model?.split('/').pop() || 'STATIC'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-border bg-secondary/20 flex justify-end">
                        <button
                            onClick={() => setDetailsDoc(null)}
                            className="px-8 py-3 rounded-xl bg-foreground text-background text-[10px] font-black tracking-widest transition-all active:scale-95 uppercase"
                        >
                            Close Profile
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Workspace Indexing Management Modal */}
            <Modal
                isOpen={isWorkspaceModalOpen}
                onClose={() => {
                    setIsWorkspaceModalOpen(false);
                    setDetailsDoc(null);
                }}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <ArrowRightLeft size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground leading-none">Manage indexing</span>
                            <span className="text-[9px] text-muted-foreground font-black tracking-widest mt-1 opacity-60">Control document visibility across workspaces</span>
                        </div>
                    </div>
                )}
                className="max-w-xl"
                containerClassName="p-0"
            >
                <div className="flex flex-col h-[550px]">
                    <div className="flex-1 overflow-y-auto px-10 pt-6 space-y-8 custom-scrollbar">
                        {/* Current Workspace Indexes */}
                        <section className="space-y-4">
                            <h5 className="text-[10px] font-black text-muted-foreground tracking-widest ml-1">Workspaces</h5>
                            <div className="space-y-3">
                                {isDetailsLoading ? (
                                    <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
                                ) : !detailsDoc || detailsDoc.relationships.length === 0 ? (
                                    <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-secondary/10 text-muted-foreground font-bold text-[11px]">No active workspace indices deployed.</div>
                                ) : (
                                    detailsDoc.relationships.map((rel, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-secondary/40 border border-border flex items-center justify-between group hover:bg-secondary/60 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-indigo-500 transition-colors">
                                                    <Database size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-foreground tracking-tight">{rel.workspace_name}</div>
                                                    <div className="text-[9px] font-bold text-indigo-500/40 tracking-widest">{rel.is_primary ? 'Primary Host' : 'Shared Reference'}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setConfirmingAction({ type: 'de-index', workspace_id: rel.workspace_id, workspace_name: rel.workspace_name })}
                                                className="h-10 px-4 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[9px] font-black tracking-widest border border-red-500/10"
                                            >
                                                Remove index
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Add to Workspace */}
                        <section className="space-y-4 pb-8">
                            <h5 className="text-[10px] font-black text-muted-foreground tracking-widest ml-1">Node Expansion</h5>
                            <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-indigo-500 tracking-[0.2em] ml-1">Select workspace</label>
                                    <Select value={shareTarget} onValueChange={setShareTarget}>
                                        <SelectTrigger className="w-full h-12 rounded-2xl px-6 bg-background border-border text-[11px] font-bold focus:ring-2 ring-indigo-500/20">
                                            <SelectValue placeholder="Select target node..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-2xl">
                                            {workspaces.map((ws) => (
                                                <SelectItem key={ws.id} value={ws.id} className="text-[11px] font-bold rounded-xl focus:bg-indigo-500 focus:text-white m-1">
                                                    {ws.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <button
                                    onClick={() => {
                                        const ws = workspaces.find(w => w.id === shareTarget);
                                        if (ws) setConfirmingAction({ type: 'index', workspace_id: ws.id, workspace_name: ws.name });
                                    }}
                                    disabled={!shareTarget || isManaging}
                                    className="w-full h-12 bg-indigo-500 text-white hover:bg-indigo-600 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 disabled:grayscale disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                    Add index
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!confirmingAction}
                onClose={() => setConfirmingAction(null)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border",
                            confirmingAction?.type === 'index' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                            {confirmingAction?.type === 'index' ? <Zap size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <span className={cn(confirmingAction?.type === 'index' ? "text-indigo-500" : "text-red-500")}>
                            Confirm action
                        </span>
                    </div>
                )}
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center space-y-8 pt-4">
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-foreground tracking-tight">
                            {confirmingAction?.type === 'index' ? 'Add index' : 'Remove connection'}
                        </h2>

                        <div className="p-6 rounded-[2rem] bg-secondary/40 border border-border space-y-6 text-left relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl" />
                            <div className="space-y-4 relative">
                                <h6 className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">Impact</h6>
                                <ul className="space-y-4">
                                    {confirmingAction?.type === 'index' ? (
                                        <>
                                            <li className="flex gap-4 text-[10px] text-muted-foreground font-bold leading-relaxed px-1">
                                                <div className="shrink-0 text-indigo-500 mt-0.5"><Plus size={12} /></div>
                                                Initialize dedicated vector representation for '{confirmingAction.workspace_name}'.
                                            </li>
                                            <li className="flex gap-4 text-[10px] text-muted-foreground font-bold leading-relaxed px-1">
                                                <div className="shrink-0 text-indigo-500 mt-0.5"><Plus size={12} /></div>
                                                Consume background compute for neural processing.
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex gap-4 text-[10px] text-red-500 font-bold leading-relaxed px-1">
                                                <div className="shrink-0 text-red-500 mt-0.5"><Trash2 size={12} /></div>
                                                Remove from neural space in node '{confirmingAction?.workspace_name}'.
                                            </li>
                                            <li className="flex gap-4 text-[10px] text-red-500 font-bold leading-relaxed px-1">
                                                <div className="shrink-0 text-red-500 mt-0.5"><AlertTriangle size={12} /></div>
                                                Active RAG flows will lose access to this source artifact.
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-border/50">
                                <p className="text-[9px] text-muted-foreground/40 font-black tracking-widest leading-tight">
                                    Note: the file will remain safe in your vault.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full pt-2">
                        <button
                            onClick={() => setConfirmingAction(null)}
                            className="h-12 rounded-2xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all font-black text-[9px] tracking-[0.2em] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirmingAction || !managingDoc) return;
                                setIsManaging(true);
                                const isIndexing = confirmingAction.type === 'index';
                                const toastId = toast.loading(`${isIndexing ? 'Indexing' : 'Removing interface'} for ${managingDoc.name}...`);

                                setConfirmingAction(null);
                                setIsWorkspaceModalOpen(false); // Close modals immediately

                                try {
                                    if (isIndexing) {
                                        await api.updateDocumentWorkspacesWorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
                                            workspaceId: confirmingAction.workspace_id,
                                            documentWorkspaceUpdate: {
                                                documentId: managingDoc.id!,
                                                targetWorkspaceId: confirmingAction.workspace_id,
                                                action: 'link',
                                                forceReindex: true
                                            }
                                        });
                                        toast.dismiss(toastId);
                                        toast.success(`Indexing started for ${managingDoc.name} in ${confirmingAction.workspace_name}`);
                                        fetchDocuments();
                                    } else {
                                        await api.deleteDocumentWorkspacesWorkspaceIdDocumentsDocumentIdDelete({
                                            documentId: managingDoc.id!,
                                            workspaceId: confirmingAction.workspace_id,
                                            vaultDelete: false
                                        });
                                        toast.dismiss(toastId);
                                        toast.success(`Removed ${managingDoc.name} from ${confirmingAction.workspace_name}`);
                                        handleDetailView(managingDoc, false);
                                        fetchDocuments();
                                    }
                                } catch (err: any) {
                                    toast.dismiss(toastId);
                                    try {
                                        const payload = await err.response.json();
                                        toast.error(`Action failed: ${payload.message || 'Unknown protocol error'}`);
                                    } catch (e) {
                                        toast.error("Network Error: Protocol synchronization failure.");
                                    }
                                } finally {
                                    setIsManaging(false);
                                    setConfirmingAction(null);
                                }
                            }}
                            disabled={isManaging}
                            className={cn(
                                "h-12 rounded-2xl font-black text-[9px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg",
                                confirmingAction?.type === 'index' ? "bg-indigo-600 text-white shadow-indigo-500/20" : "bg-red-500 text-white shadow-red-500/20"
                            )}
                        >
                            {isManaging ? <Loader2 className="animate-spin" size={14} /> : "Confirm"}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!deletingDoc}
                onClose={() => setDeletingDoc(null)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                            <Trash2 size={16} />
                        </div>
                        <span className="text-red-500">Delete file</span>
                    </div>
                )}
                className="max-w-xl"
            >
                <div className="flex flex-col gap-10 pt-4">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/5 border border-red-500/10 flex items-center justify-center mx-auto text-red-500 mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Delete file</h3>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed px-8">
                            Choose how you wish to delete <span className="text-foreground font-black">"{deletingDoc?.name}"</span>.
                            This action cannot be easily undone once confirmed.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {/* Unlink from Workspace */}
                        <div className="p-8 rounded-[2.5rem] bg-secondary/30 border border-border space-y-6 relative overflow-hidden group hover:bg-secondary/50 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em] block">Remove from workspace</span>
                                    <span className="text-[10px] font-black text-indigo-500 tracking-widest">Keep in vault</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <Database size={14} />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Select
                                        value={deleteTargetWs}
                                        onValueChange={setDeleteTargetWs}
                                    >
                                        <SelectTrigger className="h-12 rounded-2xl bg-background border-border text-[11px] font-bold">
                                            <SelectValue placeholder="Select workspace..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-2xl">
                                            {(() => {
                                                if (!deletingDoc) return null;
                                                const docWorkspaces = new Set([deletingDoc.workspace_id, ...(deletingDoc.shared_with || [])]);
                                                return Array.from(docWorkspaces)
                                                    .filter(Boolean)
                                                    .map(wsId => {
                                                        const ws = workspaces.find(w => w.id === wsId);
                                                        return (
                                                            <SelectItem key={wsId} value={wsId!} className="text-[11px] font-bold rounded-xl focus:bg-indigo-500 focus:text-white m-1">
                                                                {ws?.name || wsId}
                                                            </SelectItem>
                                                        );
                                                    });
                                            })()}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <button
                                    onClick={() => deletingDoc && handleDelete(deletingDoc.id!)}
                                    disabled={!deleteTargetWs}
                                    className="h-12 px-8 bg-indigo-500 text-white rounded-2xl font-black text-[9px] tracking-[0.2em] transition-all shadow-lg shadow-indigo-500/10 active:scale-95 disabled:grayscale disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {/* Global Delete */}
                        <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 space-y-6 group hover:bg-red-500/10 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-red-500 tracking-[0.2em] block">Delete everywhere</span>
                                    <span className="text-[10px] font-black text-red-600 tracking-widest animate-pulse">Permanent deletion</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={14} />
                                </div>
                            </div>
                            <button
                                onClick={() => deletingDoc && handleDelete(deletingDoc.id!, true)}
                                className="w-full h-14 bg-red-500 text-white hover:bg-red-400 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 active:scale-95"
                            >
                                Delete file everywhere
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center pb-4">
                        <button
                            onClick={() => setDeletingDoc(null)}
                            className="text-[9px] text-muted-foreground/40 font-black hover:text-foreground transition-colors tracking-[0.3em]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

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
