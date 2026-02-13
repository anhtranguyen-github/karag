'use client';

import { useState, useEffect } from 'react';
import {
    Upload,
    FileText,
    Trash2,
    Search,
    ArrowLeft,
    Loader2,
    Database,
    AlertCircle,
    Clock,
    CheckCircle2,
    FileCode,
    FileJson,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';

interface Document {
    id: string;
    filename: string;
    name: string;
    extension: string;
    chunks: number;
}

export default function KnowledgePage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [isViewing, setIsViewing] = useState(false);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS);
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setDocuments(result.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(API_ROUTES.UPLOAD, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                await fetchDocuments();
                // Clear input
                e.target.value = '';
            } else {
                const result = await res.json();
                console.error(result.message || 'Upload failed');
            }
        } catch {
            console.error('Connection error occurred');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_DELETE(name), {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.name !== name));
            }
        } catch (err) {
            console.error('Failed to delete document', err);
        }
    };

    const handleView = async (name: string) => {
        setIsViewing(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_GET(name));
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    const data = result.data;
                    setActiveSource({
                        id: 0,
                        name: data.name || data.filename,
                        content: data.content
                    });
                }
            }
        } catch (err) {
            console.error('Failed to view document', err);
        } finally {
            setIsViewing(false);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFileIcon = (ext: string) => {
        switch (ext.toLowerCase()) {
            case '.json': return <FileJson size={20} className="text-yellow-400" />;
            case '.md': return <FileText size={20} className="text-blue-400" />;
            case '.py': return <FileCode size={20} className="text-green-400" />;
            default: return <FileText size={20} className="text-indigo-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto px-8 py-12">
                {/* Navigation */}
                <header className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group"
                        >
                            <ArrowLeft size={20} className="text-gray-400 group-hover:text-white" />
                        </Link>
                        <div>
                            <h1 className="text-h2 font-bold tracking-tight mb-1">Knowledge Base</h1>
                            <p className="text-gray-400 text-caption font-medium">Manage and index documents for RAG processing</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-400" />
                            <span className="text-tiny font-bold text-indigo-300 uppercase tracking-wider">Sync State: Active</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Search and Controls */}
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search repository..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#121214] border border-white/10 rounded-[1.2rem] py-4 pl-12 pr-6 text-caption outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Document List */}
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    <div key="loading" className="flex flex-col items-center justify-center py-32 space-y-4">
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                        <p className="text-gray-500 font-medium">Indexing knowledge base...</p>
                                    </div>
                                ) : filteredDocs.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center py-24 text-center bg-[#121214] border border-dashed border-white/10 rounded-3xl"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                            <AlertCircle size={28} className="text-gray-600" />
                                        </div>
                                        <h3 className="text-h3 font-semibold mb-1">No documents found</h3>
                                        <p className="text-gray-400 text-caption max-w-xs px-4">
                                            {searchQuery ? "Try a different search term or clear the filter." : "Upload documents to starts building your RAG corpus."}
                                        </p>
                                    </motion.div>
                                ) : (
                                    filteredDocs.map((doc: any, idx) => (
                                        <motion.div
                                            key={doc.id || `${doc.name}-${idx}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            layout
                                            className="group flex items-center justify-between p-5 rounded-2xl bg-[#121214] border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/[0.03] shadow-lg shadow-black/20"
                                        >
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform duration-300">
                                                    {getFileIcon(doc.extension)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="text-caption font-bold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                                                        {doc.name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="flex items-center gap-1.5 text-tiny font-bold text-gray-500 uppercase tracking-tighter">
                                                            <Database size={10} className="text-indigo-500/60" />
                                                            {doc.chunks} Fragments
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                                        <span className="flex items-center gap-1.5 text-tiny font-bold text-gray-500 uppercase tracking-tighter">
                                                            <Clock size={10} className="text-indigo-500/60" />
                                                            Synced
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleView(doc.name)}
                                                    className="p-3 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95 flex items-center gap-2"
                                                    title="View document"
                                                    disabled={isViewing}
                                                >
                                                    {isViewing && activeSource?.name === doc.name ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <FileText size={18} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.name)}
                                                    className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                                                    title="Delete document"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Upload Area */}
                        <div className="relative group p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 overflow-hidden shadow-2xl shadow-indigo-600/20">
                            <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4 pointer-events-none">
                                <Upload size={120} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                                    <Upload size={24} className="text-white" />
                                </div>
                                <h3 className="text-h3 font-bold mb-2">Grow your knowledge</h3>
                                <p className="text-white/70 text-caption mb-8 leading-relaxed">
                                    Support for PDF, TXT, MD, and DOCX files. Automatic chunking and vector indexing.
                                </p>

                                <label className={cn(
                                    "relative cursor-pointer flex items-center justify-center gap-2 py-4 px-6 bg-white text-indigo-700 rounded-2xl font-bold text-caption transition-all hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-50 disabled:scale-100",
                                    isUploading ? "pointer-events-none" : ""
                                )}>
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            <span>Add Document</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>

                        {/* Storage Stats */}
                        <div className="p-8 rounded-[2rem] bg-[#121214] border border-white/5 space-y-6 shadow-xl">
                            <h4 className="text-caption font-bold uppercase tracking-widest text-indigo-400">Database Status</h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-tiny text-gray-500 font-bold uppercase tracking-tighter">Total Documents</p>
                                        <p className="text-h3 font-bold">{documents.length}</p>
                                    </div>
                                    <div className="w-12 h-1 bg-indigo-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(documents.length * 10, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-tiny text-gray-500 font-bold uppercase tracking-tighter">Vector Clusters</p>
                                        <p className="text-h3 font-bold">{documents.reduce((acc, d) => acc + d.chunks, 0)}</p>
                                    </div>
                                    <div className="w-12 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: '65%' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                                    <AlertCircle size={14} className="text-indigo-500 mt-1 shrink-0" />
                                    <p className="text-tiny leading-relaxed text-gray-400 uppercase tracking-tight font-medium">
                                        Auto-embedding is active. All uploaded content is processed through the <span className="text-gray-300">text-embedding-3-small</span> model.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
