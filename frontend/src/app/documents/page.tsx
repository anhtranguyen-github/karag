'use client';

import React, { useState } from 'react';
import { useDocuments, Document } from '@/hooks/use-documents';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
    FileText, Database, Trash2, Share2,
    Info, Search,
    ChevronLeft, Layers, Layout,
    Move, X, Check, Globe, ArrowRight, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ROUTES } from '@/lib/api-config';
import Link from 'next/link';

interface InspectedPoint {
    id: string | number;
    vector_size: number;
    vector_preview: number[];
    payload: {
        text?: string;
        [key: string]: unknown;
    };
}

export default function DocumentsPage() {
    const { documents, isLoading, deleteDocument, updateWorkspaceAction, inspectDocument } = useDocuments();
    const { workspaces } = useWorkspaces();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [inspectedPoints, setInspectedPoints] = useState<InspectedPoint[]>([]);
    const [documentContent, setDocumentContent] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'segments' | 'source'>('segments');
    const [loadingInspect, setLoadingInspect] = useState(false);
    const [actionDoc, setActionDoc] = useState<{ doc: Document, type: 'move' | 'share' } | null>(null);
    const [filterWorkspace, setFilterWorkspace] = useState<string>('all');
    const [filterExtension, setFilterExtension] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
    const [isVaultDeleteChecked, setIsVaultDeleteChecked] = useState(false);
    const [conflictData, setConflictData] = useState<{ name: string, workspace_id: string, target_id: string, action: 'move' | 'share' | 'unshare', error: string } | null>(null);

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWorkspace = filterWorkspace === 'all' || doc.workspace_id === filterWorkspace || doc.shared_with.includes(filterWorkspace);
        const matchesExtension = filterExtension === 'all' || (doc.extension || '').toLowerCase().includes(filterExtension.toLowerCase());
        const matchesStatus = filterStatus === 'all' || (doc.status || 'ready') === filterStatus;
        return matchesSearch && matchesWorkspace && matchesExtension && matchesStatus;
    });

    const extensions = Array.from(new Set(documents.map(d => (d.extension || '').toLowerCase()))).filter(Boolean);

    const handleSelectDoc = async (doc: Document) => {
        setSelectedDoc(doc);
        setLoadingInspect(true);
        setActiveTab('segments');
        setDocumentContent(null);
        setInspectedPoints([]);

        try {
            const [points, contentRes] = await Promise.all([
                inspectDocument(doc.name),
                fetch(API_ROUTES.DOCUMENT_GET(doc.name))
            ]);

            if (points) setInspectedPoints(points);

            if (contentRes.ok) {
                const result = await contentRes.json();
                if (result.success && result.data) {
                    setDocumentContent(result.data.content);
                }
            }
        } catch (err) {
            console.error('Failed to load document details:', err);
        } finally {
            setLoadingInspect(false);
        }
    };

    const handleAction = async (targetWsId: string, force: boolean = false) => {
        if (!actionDoc && !conflictData) return;

        const docName = actionDoc?.doc.name || conflictData?.name || '';
        const sourceWs = actionDoc?.doc.workspace_id || conflictData?.workspace_id || '';
        const actionType = actionDoc?.type || conflictData?.action || 'share';

        const result = await updateWorkspaceAction(
            docName,
            sourceWs,
            targetWsId,
            actionType,
            force
        );

        if (result.success) {
            setActionDoc(null);
            setConflictData(null);
        } else if (result.conflict) {
            setConflictData({
                name: docName,
                workspace_id: sourceWs,
                target_id: targetWsId,
                action: actionType,
                error: result.error || 'Dimension mismatch'
            });
            setActionDoc(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-h1 font-black tracking-tight">Knowledge Bank</h1>
                            <p className="text-gray-500 mt-1">Global document assets and cross-workspace orchestration.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#121214] border border-white/5 rounded-2xl pl-12 pr-6 py-3 w-64 focus:w-80 outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-gray-700 text-caption"
                            />
                        </div>

                        <select
                            value={filterWorkspace}
                            onChange={(e) => setFilterWorkspace(e.target.value)}
                            className="bg-[#121214] border border-white/5 rounded-2xl px-4 py-3 text-caption outline-none focus:ring-2 ring-indigo-500/20 transition-all text-gray-400 font-bold uppercase tracking-tighter"
                        >
                            <option value="all">Everywhere</option>
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterExtension}
                            onChange={(e) => setFilterExtension(e.target.value)}
                            className="bg-[#121214] border border-white/5 rounded-2xl px-4 py-3 text-caption outline-none focus:ring-2 ring-indigo-500/20 transition-all text-gray-400 font-bold uppercase tracking-tighter"
                        >
                            <option value="all">Formats</option>
                            {extensions.map(ext => (
                                <option key={ext} value={ext}>{ext.replace('.', '')}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-[#121214] border border-white/5 rounded-2xl px-4 py-3 text-caption outline-none focus:ring-2 ring-indigo-500/20 transition-all text-gray-400 font-bold uppercase tracking-tighter"
                        >
                            <option value="all">Health</option>
                            <option value="ready">Ready</option>
                            <option value="processing">Processing</option>
                            <option value="error">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-8 py-6 text-tiny font-black text-gray-500 uppercase tracking-[0.2em]">Document Name</th>
                                    <th className="px-8 py-6 text-tiny font-black text-gray-500 uppercase tracking-[0.2em]">Primary Workspace</th>
                                    <th className="px-8 py-6 text-tiny font-black text-gray-500 uppercase tracking-[0.2em]">Distribution</th>
                                    <th className="px-8 py-6 text-tiny font-black text-gray-500 uppercase tracking-[0.2em]">Assets</th>
                                    <th className="px-8 py-6 text-tiny font-black text-gray-500 uppercase tracking-[0.2em] text-right pr-12">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="inline-block w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                ) : filteredDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center text-gray-600">
                                            No documents found in the current scope.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDocs.map((doc, idx) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={`${doc.id || doc.name}-${idx}`}
                                            className="group hover:bg-white/[0.01] border-b border-white/5 transition-all"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <div
                                                            onClick={() => handleSelectDoc(doc)}
                                                            data-testid="doc-name"
                                                            data-doc-name={doc.name}
                                                            className="font-bold text-caption text-gray-200 group-hover:text-indigo-400 transition-colors uppercase tracking-tight cursor-pointer"
                                                        >
                                                            {doc.name}
                                                        </div>
                                                        <div className="text-tiny text-gray-600 mt-1 uppercase font-black tracking-widest">{doc.extension}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">
                                                    <Layers size={12} className="text-gray-500" />
                                                    <span className="text-tiny font-bold text-gray-400">
                                                        {workspaces.find(ws => ws.id === doc.workspace_id)?.name || doc.workspace_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-1">
                                                    {doc.shared_with.length > 0 ? (
                                                        <div className="flex -space-x-2">
                                                            {doc.shared_with.slice(0, 3).map(wsId => (
                                                                <div key={wsId} className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-[#121214] flex items-center justify-center text-tiny font-black text-white" title={wsId}>
                                                                    {wsId[0].toUpperCase()}
                                                                </div>
                                                            ))}
                                                            {doc.shared_with.length > 3 && (
                                                                <div className="w-6 h-6 rounded-full bg-gray-800 border-2 border-[#121214] flex items-center justify-center text-tiny font-black text-gray-400">
                                                                    +{doc.shared_with.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-tiny text-gray-700 font-bold uppercase tracking-widest">
                                                            <Globe size={10} />
                                                            Private
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-tiny text-indigo-400/70">
                                                    {doc.chunks} Segments
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right pr-12">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSelectDoc(doc)}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                                                        title="Detailed Info"
                                                    >
                                                        <Info size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDoc({ doc, type: 'share' })}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-indigo-400 transition-all"
                                                        title="Share"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDoc({ doc, type: 'move' })}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-purple-400 transition-all"
                                                        title="Move"
                                                    >
                                                        <Move size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingDoc(doc)}
                                                        data-testid={`delete-doc-${doc.name}`}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                                                        title="Delete Operation"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Document Details Modal (Metadata Inspector) */}
            <AnimatePresence>
                {selectedDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-[#121214] border border-white/10 rounded-[3rem] p-12 shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <button onClick={() => setSelectedDoc(null)} className="absolute top-10 right-10 p-3 rounded-2xl hover:bg-white/5 text-gray-500 transition-all">
                                <X size={24} />
                            </button>

                            <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-8">
                                <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-xl border border-indigo-500/20">
                                    <Database size={32} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 text-tiny font-black text-gray-500 uppercase tracking-[0.2em] mb-1">
                                        <span>Inventory ID: {selectedDoc.workspace_id}</span>
                                        <span className="opacity-20">•</span>
                                        <span className="text-indigo-400">Knowledge Asset</span>
                                    </div>
                                    <h2 className="text-h3 font-black uppercase tracking-tight truncate max-w-2xl">{selectedDoc.name}</h2>
                                </div>

                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => setActiveTab('segments')}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl text-tiny font-black uppercase tracking-widest transition-all",
                                            activeTab === 'segments' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Segments
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('source')}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl text-tiny font-black uppercase tracking-widest transition-all",
                                            activeTab === 'source' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        Source
                                    </button>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {loadingInspect ? (
                                    <div className="flex-1 flex flex-col items-center justify-center grayscale opacity-50">
                                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                        <div className="text-tiny font-black uppercase tracking-widest text-gray-600">Reconstructing Data Layer...</div>
                                    </div>
                                ) : activeTab === 'segments' ? (
                                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar lg:grid lg:grid-cols-2 gap-4 pb-10">
                                        {inspectedPoints.map(point => (
                                            <div key={point.id} className="bg-[#0a0a0b]/50 border border-white/5 rounded-[2rem] p-6 text-tiny mb-4 h-fit">
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                                    <span className="text-indigo-500 font-bold tracking-tighter">Point ID: {String(point.id).slice(0, 16)}...</span>
                                                    <span className="bg-indigo-500/10 px-2 py-0.5 rounded text-tiny text-indigo-400 font-black uppercase tracking-widest">
                                                        Dim: {point.vector_size}
                                                    </span>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="text-tiny font-black text-gray-600 uppercase tracking-widest mb-2 pr-2">Vector Preview</div>
                                                        <div className="bg-[#121214] p-3 rounded-xl text-indigo-300/60 overflow-x-auto whitespace-nowrap text-tiny">
                                                            [{point.vector_preview.map((v: number) => v.toFixed(4)).join(', ')} ... ]
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-tiny font-black text-gray-600 uppercase tracking-widest mb-2 pr-2">Payload Content</div>
                                                        <div className="bg-[#121214] p-4 rounded-xl text-gray-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                                            {point.payload.text || 'No text content'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0b]/50 border border-white/5 rounded-[2rem] p-8">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                                            <div className="text-tiny font-black text-gray-500 uppercase tracking-widest">Global Asset Buffer</div>
                                            <div className="text-tiny font-bold text-indigo-400 uppercase tracking-widest">UTF-8 Encoded</div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar text-caption text-gray-400 leading-relaxed whitespace-pre-wrap pr-4 pb-10">
                                            {documentContent || 'No source content available for this document.'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Action Modal (Move/Share) */}
            <AnimatePresence>
                {actionDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActionDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <h2 className="text-h3 font-black mb-2 uppercase tracking-tight">
                                {actionDoc.type === 'move' ? 'Move Document' : 'Share Document'}
                            </h2>
                            <p className="text-gray-500 text-caption mb-8">
                                {actionDoc.type === 'move'
                                    ? `Migrate "${actionDoc.doc.name}" to another project environment.`
                                    : `Enable access for "${actionDoc.doc.name}" in a different workspace context.`}
                            </p>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {workspaces
                                    .filter(ws => ws.id !== actionDoc.doc.workspace_id)
                                    .map(ws => (
                                        <button
                                            key={ws.id}
                                            onClick={() => handleAction(ws.id)}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <Layout size={16} />
                                                </div>
                                                <span className="font-bold text-caption tracking-tight">{ws.name}</span>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-700 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <Check size={12} />
                                            </div>
                                        </button>
                                    ))
                                }
                                {workspaces.length <= 1 && (
                                    <div className="text-center py-6 text-gray-600 text-caption">
                                        No other workspaces available.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setActionDoc(null)}
                                className="w-full mt-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Document Deletion Confirmation Modal */}
            <AnimatePresence>
                {deletingDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDeletingDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-h3 font-black mb-2 uppercase tracking-tight">Delete Document?</h2>
                            <p className="text-gray-500 text-caption mb-8 leading-relaxed">
                                You are removing <span className="text-white font-bold">{deletingDoc.name}</span> from the current workspace context.
                            </p>

                            <div
                                onClick={() => setIsVaultDeleteChecked(!isVaultDeleteChecked)}
                                data-testid="vault-purge-toggle"
                                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 mb-8 cursor-pointer hover:bg-white/10 transition-all select-none group"
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                    isVaultDeleteChecked ? "bg-red-500 border-red-500 text-white" : "border-white/10 text-transparent"
                                )}>
                                    <Trash2 size={12} />
                                </div>
                                <div className="text-left">
                                    <div className="text-tiny font-black uppercase text-gray-400 group-hover:text-white transition-colors">Apply Global Purge</div>
                                    <div className="text-tiny text-gray-600">Permanently erase from the central vault storage</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        await deleteDocument(deletingDoc.name, deletingDoc.workspace_id, isVaultDeleteChecked);
                                        setDeletingDoc(null);
                                        setIsVaultDeleteChecked(false);
                                    }}
                                    data-testid="confirm-purge-btn"
                                    className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-500 active:scale-95 transition-all shadow-xl shadow-red-600/20"
                                >
                                    Confirm Deletion
                                </button>
                                <button
                                    onClick={() => setDeletingDoc(null)}
                                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-500 font-bold hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dimension Conflict / Re-index Modal */}
            <AnimatePresence>
                {conflictData && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConflictData(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-lg bg-gradient-to-b from-[#1a1a1c] to-[#121214] border border-amber-500/20 rounded-[3rem] p-12 shadow-2xl text-center"
                        >
                            <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-8 border border-amber-500/10">
                                <Database size={48} />
                            </div>

                            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-tiny font-black uppercase tracking-widest mb-6">
                                Architecture Mismatch Detected
                            </div>

                            <h2 className="text-h2 font-black mb-4 uppercase tracking-tighter leading-none">
                                Embedding Collision
                            </h2>

                            <p className="text-gray-400 text-caption mb-10 leading-relaxed font-medium">
                                The target workspace uses a different embedding model. To enable "{conflictData.name}" here, we must <span className="text-white font-bold">generate a new index</span> optimized for the target's architecture.
                            </p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handleAction(conflictData.target_id, true)}
                                    className="w-full py-5 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-[0.2em] hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 group"
                                >
                                    Launch Re-index
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={() => setConflictData(null)}
                                    className="w-full py-5 rounded-[2rem] bg-white/5 border border-white/5 text-gray-500 font-bold hover:bg-white/10 hover:text-gray-300 transition-all active:scale-95"
                                >
                                    Abort Transfer
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-6 opacity-30">
                                <span className="text-tiny font-bold uppercase tracking-widest">Qdrant v1.12</span>
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                <span className="text-tiny font-bold uppercase tracking-widest">Vector isolation active</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
