import React from 'react';
import { AlertCircle, Database, Copy, ArrowRight, Layers } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface DuplicateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onResolve: (strategy: 'rename' | 'use_existing' | 'overwrite') => void;
    conflict: {
        type: 'exact_duplicate' | 'name_collision' | 'content_collision';
        filename: string;
        suggested_name: string;
        existing_doc?: {
            id: string;
            filename: string;
            workspace: string;
        };
    };
    isProcessing: boolean;
}

export function DuplicateModal({ isOpen, onClose, onResolve, conflict, isProcessing }: DuplicateModalProps) {
    const renderConflictDescription = () => {
        switch (conflict.type) {
            case 'exact_duplicate':
                return "This exact document signature already exists within this environment node.";
            case 'name_collision':
                return "A node with this identifier already exists, though the content payload differs.";
            case 'content_collision':
                return `A content match was detected in the Global Vault (Origin: ${conflict.existing_doc?.workspace}).`;
            default:
                return "A structural conflict was detected during ingestion.";
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3 text-red-500">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Layers size={16} />
                    </div>
                    <span>Ingestion Conflict</span>
                </div>
            )}
            className="max-w-lg"
            containerClassName="p-0"
        >
            <div className="flex flex-col gap-6 pt-2">
                <div className="px-8 space-y-6 pb-2">
                    <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <AlertCircle size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Duplicate Asset Protocol</h3>
                            <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-black">
                                {conflict.type.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed text-center italic">
                        "{renderConflictDescription()}"
                    </p>

                    <div className="space-y-3">
                        {/* Option 1: Use Existing */}
                        {(conflict.type === 'content_collision' || conflict.type === 'exact_duplicate') && (
                            <button
                                onClick={() => onResolve('use_existing')}
                                disabled={isProcessing}
                                className="w-full p-5 rounded-2xl bg-secondary/30 border border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left flex items-start gap-4 group"
                            >
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/10 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Database size={18} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-1">Link Global Entry</h3>
                                    <p className="text-[10px] text-muted-foreground leading-snug">Reuse existing index vectors to optimize performance.</p>
                                </div>
                                <ArrowRight size={14} className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-indigo-500 transition-all self-center" />
                            </button>
                        )}

                        {/* Option 2: Rename */}
                        <button
                            onClick={() => onResolve('rename')}
                            disabled={isProcessing}
                            className="w-full p-5 rounded-2xl bg-secondary/30 border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left flex items-start gap-4 group"
                        >
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                <Copy size={18} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-1">Create Discrete Copy</h3>
                                <p className="text-[10px] text-muted-foreground leading-snug">Rename to <span className="text-foreground font-bold">{conflict.suggested_name}</span>.</p>
                            </div>
                            <ArrowRight size={14} className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-amber-500 transition-all self-center" />
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-end">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-6 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase text-muted-foreground hover:text-foreground transition-all"
                    >
                        Abort Ingestion
                    </button>
                </div>
            </div>
        </Modal>
    );
}
