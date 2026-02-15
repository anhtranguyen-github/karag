import React from 'react';
import { motion } from 'framer-motion';
import { X, FileText, AlertTriangle } from 'lucide-react';

interface Source {
    id: number;
    name: string;
    content: string | null;
    download_url?: string;
}

export function SourceViewer({ source, onClose }: { source: Source, onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <FileText className="text-blue-400 w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-h3 font-bold text-white leading-tight">Source [{source.id}]</h2>
                            <p className="text-tiny text-gray-400 truncate max-w-[300px]">{source.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {source.content ? (
                        <div className="prose prose-invert max-w-none">
                            <div
                                data-testid="source-content"
                                className="text-gray-300 leading-relaxed whitespace-pre-wrap text-caption md:text-body"
                            >
                                {source.content}
                            </div>
                        </div>
                    ) : source.download_url ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <FileText size={40} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-caption font-black text-white">Full Document Access</h4>
                                <p className="text-tiny text-gray-500 font-bold max-w-xs">This document type requires external viewing or direct access via signed URL.</p>
                            </div>
                            <a
                                href={source.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-12 px-8 flex items-center gap-3 rounded-2xl bg-white text-black hover:bg-gray-200 transition-all font-black text-tiny tracking-widest active:scale-95 shadow-xl shadow-white/5"
                            >
                                OPEN DOCUMENT
                            </a>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                            <AlertTriangle size={48} className="text-gray-600" />
                            <span className="text-tiny font-black text-gray-600">Content Unavailable</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 px-8 border-t border-white/5 bg-white/2 flex justify-between items-center">
                    <span className="text-tiny text-gray-500  ">Vault Document Reference</span>
                    <button
                        onClick={onClose}
                        className="text-tiny font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
