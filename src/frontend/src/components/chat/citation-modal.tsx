"use client";

import { FileText, Shield } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface CitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: {
        id: number;
        name: string;
        content: string;
        metadata?: Record<string, unknown>;
    } | null;
}

export function CitationModal({ isOpen, onClose, source }: CitationModalProps) {
    if (!source) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-foreground tracking-tight">Source Reference [{source.id}]</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{source.name}</p>
                    </div>
                </div>
            )}
            className="max-w-3xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col max-h-[70vh]">
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                        <div className="flex items-center gap-2 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <FileText size={16} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Context Fragment Extraction</span>
                        </div>

                        <p className="text-foreground/90 leading-relaxed font-medium text-sm whitespace-pre-wrap">
                            {source.content}
                        </p>

                        {source.metadata && Object.keys(source.metadata).length > 0 && (
                            <div className="mt-10 pt-8 border-t border-border">
                                <h5 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] mb-4">Metadata Payload</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(source.metadata).map(([key, value]) => (
                                        <div key={key} className="p-4 rounded-xl bg-secondary/50 border border-border">
                                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{key}</span>
                                            <span className="text-xs font-medium text-muted-foreground truncate block">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 text-[10px] font-black tracking-widest transition-all active:scale-95 uppercase"
                    >
                        Close Reference
                    </button>
                </div>
            </div>
        </Modal>
    );
}
