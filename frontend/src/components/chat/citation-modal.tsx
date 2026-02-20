"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Shield, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-3xl bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Source Reference [{source.id}]</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{source.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="prose prose-invert max-w-none">
                                <div className="flex items-center gap-2 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <FileText size={16} className="text-gray-500" />
                                    <span className="text-xs font-medium text-gray-400">Context Fragment Extraction</span>
                                </div>

                                <p className="text-gray-300 leading-relaxed font-medium text-sm whitespace-pre-wrap">
                                    {source.content}
                                </p>

                                {source.metadata && Object.keys(source.metadata).length > 0 && (
                                    <div className="mt-10 pt-8 border-t border-white/5">
                                        <h5 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4">Metadata Payload</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(source.metadata).map(([key, value]) => (
                                                <div key={key} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                                    <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{key}</span>
                                                    <span className="text-xs font-medium text-gray-400 truncate block">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-8 py-4 rounded-2xl bg-white text-black hover:bg-gray-200 text-xs font-black tracking-widest transition-all active:scale-95"
                            >
                                CLOSE REFERENCE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
