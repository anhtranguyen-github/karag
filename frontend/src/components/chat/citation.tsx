'use client';

import React from 'react';
import { X, FileText, Database, Hash, Layers, Box, LucideIcon } from 'lucide-react';

interface CitationSource {
    id: number;
    name: string;
    content: string;
    // Extended metadata
    doc_id?: string;
    workspace_id?: string;
    minio_path?: string;
    chunk_index?: number;
    total_chunks?: number;
    content_hash?: string;
    rag_config_hash?: string;
    embedding_model?: string;
    chunk_size?: number;
    chunk_overlap?: number;
}

interface CitationModalProps {
    source: CitationSource;
    onClose: () => void;
}

export function CitationModal({ source, onClose }: CitationModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0f0f10] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                            <FileText size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-h3 font-bold text-white">{source.name}</h3>
                            <p className="text-tiny text-gray-500">
                                Citation [{source.id}] • {source.workspace_id ? `Workspace: ${source.workspace_id}` : 'Document Source'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {source.doc_id && (
                            <MetaItem icon={Hash} label="Document ID" value={source.doc_id} />
                        )}
                        {source.chunk_index !== undefined && (
                            <MetaItem
                                icon={Layers}
                                label="Chunk"
                                value={`${source.chunk_index + 1}${source.total_chunks ? ` of ${source.total_chunks}` : ''}`}
                            />
                        )}
                        {source.embedding_model && (
                            <MetaItem icon={Database} label="Embed Model" value={source.embedding_model} />
                        )}
                        {source.chunk_size && (
                            <MetaItem icon={Box} label="Chunk Size" value={`${source.chunk_size} / ${source.chunk_overlap || 0}`} />
                        )}
                        {source.content_hash && (
                            <MetaItem icon={Hash} label="Content Hash" value={source.content_hash.slice(0, 12) + '...'} />
                        )}
                        {source.rag_config_hash && (
                            <MetaItem icon={Hash} label="RAG Config" value={source.rag_config_hash.slice(0, 12) + '...'} />
                        )}
                    </div>

                    {/* Document Content */}
                    <div className="bg-[#1a1a1c] rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                            <FileText size={14} className="text-gray-500" />
                            <span className="text-tiny font-semibold text-gray-400 ">Source Content</span>
                        </div>
                        <div className="text-caption text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {source.content}
                        </div>
                    </div>

                    {/* Path Info */}
                    {source.minio_path && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg">
                            <span className="text-tiny text-gray-500">Storage Path: </span>
                            <code className="text-tiny text-gray-400">{source.minio_path}</code>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-caption font-medium text-gray-300 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                <Icon size={12} className="text-gray-500" />
                <span className="text-tiny text-gray-500 ">{label}</span>
            </div>
            <span className="text-caption text-white font-medium truncate block">{value}</span>
        </div>
    );
}

// Citation Badge Component (for use in messages)
interface CitationBadgeProps {
    id: number;
    name?: string;
    onClick: () => void;
}

export function CitationBadge({ id, name, onClick }: CitationBadgeProps) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-tiny font-semibold hover:bg-blue-500/30 transition-all ml-1"
            title={name || `Citation ${id}`}
        >
            <FileText size={10} />
            <span>[{id}]</span>
        </button>
    );
}
