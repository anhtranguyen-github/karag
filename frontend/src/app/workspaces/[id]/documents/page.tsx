'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText, Upload, Trash2, Share2, Search,
    Loader2, Grid, List, Network
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useError } from '@/context/error-context';
import { cn } from '@/lib/utils';
import { DocumentGraph } from '@/components/documents/document-graph';
import { getIllegalCharsFound } from '@/lib/constants';
import { DuplicateModal } from '@/components/documents/duplicate-modal';

interface Document {
    id: string;
    filename: string;
    extension: string;
    status: string;
    size_bytes: number;
    chunks: number;
    created_at: string;
    workspace_id: string;
    shared_with: string[];
}

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('list');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Conflict Management
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [conflictData, setConflictData] = useState<any>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const fetchDocuments = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/documents?workspace_id=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchDocuments();
    }, [workspaceId, fetchDocuments]);

    const { showError } = useError();
    const notifiedTasksRef = React.useRef<Set<string>>(new Set());

    // Poll for active tasks and failures
    useEffect(() => {
        const pollTasks = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/tasks/?type=ingestion`);
                if (res.ok) {
                    const data = await res.json();

                    // Check for active failures we haven't shown yet
                    const failedTasks = data.tasks.filter((t: any) =>
                        t.status === 'failed' &&
                        t.metadata.workspace_id === workspaceId &&
                        !notifiedTasksRef.current.has(t.id)
                    );

                    for (const task of failedTasks) {
                        let displayTitle = "Ingestion Failed";
                        let displayMessage = task.message || "The system encountered an error while processing this document.";

                        if (task.error_code === 'ILLEGAL_PATH') {
                            displayTitle = "Invalid Filename";
                            displayMessage = "The filename contains characters that are not allowed by the storage system.";
                        }

                        showError(
                            displayTitle,
                            displayMessage,
                            `File: ${task.metadata.filename || 'Unknown'}`
                        );
                        notifiedTasksRef.current.add(task.id);
                    }

                    // Check for completions to refresh the list
                    const hasJustCompleted = data.tasks.some((t: any) =>
                        t.status === 'completed' &&
                        t.progress === 100 &&
                        t.metadata.workspace_id === workspaceId &&
                        !notifiedTasksRef.current.has(t.id)
                    );

                    if (hasJustCompleted) {
                        fetchDocuments(false);
                    }
                }
            } catch (err) {
                console.error('Task polling failed', err);
            }
        };

        const interval = setInterval(pollTasks, 2000);
        return () => clearInterval(interval);
    }, [workspaceId, fetchDocuments, showError]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement> | null, strategy?: string) => {
        let file = pendingFile;
        if (e && e.target.files?.[0]) {
            file = e.target.files[0];
        }

        if (!file || !workspaceId) return;

        // Optimistic Validation (only if not already validated)
        if (!strategy) {
            const found = getIllegalCharsFound(file.name);
            if (found.length > 0) {
                showError("Invalid Filename", `The filename contains characters that are not allowed: ${found.join(' ')}. Please rename the file and try again.`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            let url = `${API_BASE_URL}/upload?workspace_id=${workspaceId}`;
            if (strategy) url += `&strategy=${strategy}`;

            const res = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIsDuplicateModalOpen(false);
                setPendingFile(null);
                setConflictData(null);
                // Task is now handled by the polling effect
            } else if (data.code === 'DUPLICATE_DETECTED') {
                // Duplicate detected
                setConflictData(data.data);
                setPendingFile(file);
                setIsDuplicateModalOpen(true);
            } else {
                let title = "Ingestion Rejected";
                let message = data.message || data.detail || 'Upload failed';

                if (data.code === 'INVALID_FILENAME') {
                    title = "Invalid Filename";
                } else if (data.code === 'CONFLICT_ERROR') {
                    title = "Duplicate Document";
                }

                showError(title, message, `File: ${file.name}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Network error';
            showError("Network Error", errorMessage);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleResolveDuplicate = (strategy: string) => {
        handleUpload(null, strategy);
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}?workspace_id=${workspaceId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setDocuments(prev => prev.filter(doc => doc.filename !== filename));
            } else {
                const error = await res.json();
                showError("Delete Failed", error.detail || 'Could not delete document', `File: ${filename}`);
            }
        } catch (err) {
            console.error('Delete error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Network error';
            showError("Network Error", errorMessage);
        }
    };


    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'indexed': return 'bg-green-500/20 text-green-400';
            case 'indexing': return 'bg-yellow-500/20 text-yellow-400';
            case 'failed': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const [isArxivModalOpen, setIsArxivModalOpen] = useState(false);
    const [arxivUrl, setArxivUrl] = useState('');
    const [isArxivLoading, setIsArxivLoading] = useState(false);

    const [arxivStrategy, setArxivStrategy] = useState<string | null>(null);

    const handleArxivResolve = (strategy: string) => {
        setIsDuplicateModalOpen(false);
        // We reuse the same logic but with the saved arxivUrl
        const retryArxiv = async () => {
            setIsArxivLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/upload-arxiv?workspace_id=${workspaceId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: arxivUrl, strategy }),
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setIsArxivModalOpen(false);
                    setArxivUrl('');
                    setConflictData(null);
                } else {
                    showError("ArXiv Import Failed", data.message || data.detail || 'Failed to download paper', `Source: ${arxivUrl}`);
                }
            } catch (err) {
                console.error('ArXiv retry error:', err);
                showError("Network Error", "Could not connect to reasoning engine.");
            } finally {
                setIsArxivLoading(false);
            }
        };
        retryArxiv();
    };

    const handleArxivUpload = async (strategy?: string) => {
        if (!arxivUrl || !workspaceId) return;

        setIsArxivLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/upload-arxiv?workspace_id=${workspaceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: arxivUrl, strategy }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIsArxivModalOpen(false);
                setArxivUrl('');
                setConflictData(null);
                // Task is now handled by the polling effect
            } else if (data.code === 'DUPLICATE_DETECTED') {
                setConflictData(data.data);
                setIsDuplicateModalOpen(true);
            } else {
                showError("ArXiv Import Failed", data.message || data.detail || 'Failed to download paper', `Source: ${arxivUrl}`);
            }
        } catch (err) {
            console.error('ArXiv error:', err);
            showError("Network Error", "Could not connect to reasoning engine.");
        } finally {
            setIsArxivLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0a0a0b]/50 backdrop-blur-md">
                <div>
                    <h1 className="text-h3 font-bold text-white">Documents</h1>
                    <p className="text-caption text-gray-500">
                        {documents.length} documents in workspace
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUpload}
                        className="hidden"
                        accept=".pdf,.txt,.docx,.md"
                    />
                    <button
                        onClick={() => setIsArxivModalOpen(true)}
                        className="px-4 py-2 rounded-lg text-caption font-medium flex items-center gap-2 transition-all bg-white/5 border border-white/10 text-white hover:bg-white/10"
                    >
                        <Network size={16} className="text-blue-400" />
                        From ArXiv
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={cn(
                            "px-4 py-2 rounded-lg text-caption font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20",
                            isUploading
                                ? "bg-blue-600/50 cursor-not-allowed text-white/50"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                        )}
                    >
                        {isUploading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Upload size={16} />
                        )}
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                </div>
            </header>

            {/* ArXiv Modal */}
            {isArxivModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-h4 font-bold text-white mb-2">Import from ArXiv</h2>
                            <p className="text-caption text-gray-500 mb-6">Enter the ArXiv paper URL or ID (e.g., 1706.03762)</p>

                            <input
                                type="text"
                                placeholder="https://arxiv.org/abs/..."
                                value={arxivUrl}
                                onChange={(e) => setArxivUrl(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 ring-blue-500/50 mb-6"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleArxivUpload()}
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsArxivModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-caption font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleArxivUpload}
                                    disabled={!arxivUrl || isArxivLoading}
                                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-caption font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isArxivLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Import Paper
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="p-4 border-b border-white/10 flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-caption focus:outline-none focus:ring-2 ring-blue-500/50"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-caption text-gray-300 focus:outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="indexed">Indexed</option>
                    <option value="indexing">Indexing</option>
                    <option value="failed">Failed</option>
                </select>

                {/* View Mode */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded",
                            viewMode === 'list' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                    >
                        <List size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded",
                            viewMode === 'grid' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                        title="Grid View"
                    >
                        <Grid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={cn(
                            "p-2 rounded",
                            viewMode === 'graph' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                        title="Graph View"
                    >
                        <Network size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-600 mb-4" />
                        <p className="text-gray-400 mb-2">No documents found</p>
                        <p className="text-caption text-gray-600">
                            {documents.length === 0
                                ? 'Upload your first document to get started'
                                : 'Try adjusting your search or filters'}
                        </p>
                    </div>
                ) : viewMode === 'list' ? (
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-tiny text-gray-500 uppercase border-b border-white/5">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Type</th>
                                <th className="pb-3 font-medium">Size</th>
                                <th className="pb-3 font-medium">Chunks</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                    onClick={() => router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)}
                                >
                                    <td className="py-3">
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-gray-500" />
                                            <span className="text-white font-medium">{doc.filename}</span>
                                            {doc.shared_with.length > 0 && (
                                                <Share2 size={12} className="text-blue-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 text-caption text-gray-400 uppercase">{doc.extension}</td>
                                    <td className="py-3 text-caption text-gray-400">{formatBytes(doc.size_bytes)}</td>
                                    <td className="py-3 text-caption text-gray-400">{doc.chunks}</td>
                                    <td className="py-3">
                                        <span className={cn("px-2 py-1 rounded text-tiny font-medium", getStatusColor(doc.status))}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-caption text-gray-500">{formatDate(doc.created_at)}</td>
                                    <td className="py-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(doc.filename);
                                            }}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Document"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredDocs.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/workspaces/${workspaceId}/documents/${doc.id}`}
                                className="p-4 bg-[#121214] rounded-xl border border-white/5 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <FileText size={20} className="text-blue-500" />
                                    </div>
                                    <span className={cn("px-2 py-0.5 rounded text-tiny font-medium", getStatusColor(doc.status))}>
                                        {doc.status}
                                    </span>
                                </div>
                                <h3 className="text-caption font-medium text-white truncate mb-1">{doc.filename}</h3>
                                <p className="text-tiny text-gray-500">
                                    {formatBytes(doc.size_bytes)} • {doc.chunks} chunks
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <DocumentGraph workspaceId={workspaceId} />
                )}
            </div>

            {/* Duplicate Conflict Resolution Modal */}
            <DuplicateModal
                isOpen={isDuplicateModalOpen}
                onClose={() => {
                    setIsDuplicateModalOpen(false);
                    setPendingFile(null);
                }}
                conflict={conflictData}
                isProcessing={isUploading || isArxivLoading}
                onResolve={(strategy) => {
                    if (pendingFile) {
                        handleResolveDuplicate(strategy);
                    } else {
                        handleArxivResolve(strategy);
                    }
                }}
            />
        </div>
    );
}
