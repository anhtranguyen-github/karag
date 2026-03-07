import React from 'react';
import { X, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface Source {
    id: string | number;
    name: string;
    content: string | null;
    download_url?: string;
}

export function SourceViewer({ source, onClose }: { source: Source, onClose: () => void }) {
    return (
        <Modal
            isOpen={true} // Controlled by parent
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <FileText size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground leading-none">Source Artifact [{source.id}]</span>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">
                            {source.name.slice(0, 40)}{source.name.length > 40 ? '...' : ''}
                        </span>
                    </div>
                </div>
            )}
            className="max-w-3xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col max-h-[75vh]">
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {source.content ? (
                        <div className="prose prose-invert max-w-none">
                            <div
                                data-testid="source-content"
                                className="text-foreground/90 leading-relaxed font-medium text-sm whitespace-pre-wrap bg-secondary/20 p-6 rounded-[2rem] border border-border"
                            >
                                {source.content}
                            </div>
                        </div>
                    ) : source.download_url ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-8">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center text-indigo-500/20">
                                <FileText size={48} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">External Asset Detected</h4>
                                <p className="text-[10px] text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
                                    This document type requires specialized processing or direct access via a secure endpoint.
                                </p>
                            </div>
                            <a
                                href={source.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-12 px-10 flex items-center gap-3 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all font-black text-[10px] tracking-[0.2em] uppercase active:scale-95 shadow-lg shadow-indigo-500/20"
                            >
                                <ExternalLink size={14} />
                                Open Knowledge Source
                            </a>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30 italic">
                            <AlertTriangle size={48} className="text-muted-foreground" />
                            <span className="text-xs font-medium">Content Payload Irretrievable</span>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-between items-center px-10">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Security Protocol: Read-Only Artifact</span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-foreground text-background text-[10px] font-black tracking-widest uppercase hover:opacity-90 transition-all active:scale-95"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </Modal>
    );
}
