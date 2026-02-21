'use client';

import React from 'react';
import { FileText, Database, Hash, Layers, Box, LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface CitationSource {
    id: number;
    name: string;
    content: string;
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground leading-tight">{source.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                            Citation Artifact [{source.id}]
                        </p>
                    </div>
                </div>
            )}
            className="max-w-3xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col max-h-[75vh]">
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {source.doc_id && (
                            <MetaItem icon={Hash} label="Document ID" value={source.doc_id.slice(0, 12)} />
                        )}
                        {source.workspace_id && (
                            <MetaItem icon={Database} label="Workspace" value={source.workspace_id} />
                        )}
                        {source.chunk_index !== undefined && (
                            <MetaItem
                                icon={Layers}
                                label="Chunk"
                                value={`${source.chunk_index + 1}${source.total_chunks ? ` / ${source.total_chunks}` : ''}`}
                            />
                        )}
                        {source.embedding_model && (
                            <MetaItem icon={Database} label="Embed Model" value={source.embedding_model.split('/').pop() || 'N/A'} />
                        )}
                        {source.chunk_size && (
                            <MetaItem icon={Box} label="Block Size" value={`${source.chunk_size}`} />
                        )}
                    </div>

                    {/* Document Content */}
                    <div className="bg-secondary/20 rounded-3xl p-6 border border-border">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                            <FileText size={14} className="text-muted-foreground opacity-50" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Source Context Payload</span>
                        </div>
                        <div className="text-xs font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {source.content}
                        </div>
                    </div>

                    {/* Path Info */}
                    {source.minio_path && (
                        <div className="mt-6 p-4 bg-secondary/40 rounded-2xl border border-border flex items-center gap-3">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest shrink-0">Storage Path</span>
                            <code className="text-[9px] font-mono text-indigo-400 truncate">{source.minio_path}</code>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-foreground text-background text-[10px] font-black tracking-widest transition-all active:scale-95 uppercase"
                    >
                        Close View
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="p-4 bg-secondary/40 rounded-2xl border border-border group hover:bg-secondary/60 transition-all">
            <div className="flex items-center gap-2 mb-1">
                <Icon size={12} className="text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[11px] font-bold text-foreground truncate block">{value}</span>
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-black tracking-wider hover:bg-indigo-500/20 transition-all ml-1 border border-indigo-500/20 active:scale-95 shadow-sm"
            title={name || `Citation ${id}`}
        >
            <FileText size={10} strokeWidth={3} />
            <span>[{id}]</span>
        </button>
    );
}
