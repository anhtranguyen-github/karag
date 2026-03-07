'use client';

import React from 'react';
import { ShieldAlert, Terminal, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    details?: string;
}

export function ErrorModal({ isOpen, onClose, title = "Notice", message, details }: ErrorModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3 text-red-500">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <AlertCircle size={16} />
                    </div>
                    <span>{title}</span>
                </div>
            )}
            className="max-w-md"
        >
            <div className="flex flex-col gap-6 pt-2">
                <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 flex flex-col items-center text-center gap-4 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl opacity-50" />

                    <div className="w-14 h-14 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5">
                        <ShieldAlert size={28} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-base font-bold text-foreground">Error</h3>
                        <p className="text-[10px] text-red-500/60 font-bold leading-tight">
                            Something went wrong
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed text-center px-4">
                        {message}
                    </p>

                    {details && (
                        <div className="p-4 bg-secondary/40 rounded-2xl border border-border flex gap-3 group">
                            <Terminal size={14} className="shrink-0 mt-0.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[10px] font-mono text-muted-foreground leading-tight break-all">
                                {details}
                            </span>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full h-12 rounded-2xl bg-red-500 text-white text-[9px] font-bold tracking-[0.2em] hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
