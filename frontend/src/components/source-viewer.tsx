import React from 'react';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';

interface Source {
    id: number;
    name: string;
    content: string;
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
                    <div className="prose prose-invert max-w-none">
                        <div
                            data-testid="source-content"
                            className="text-gray-300 leading-relaxed whitespace-pre-wrap text-caption md:text-body"
                        >
                            {source.content}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 px-8 border-t border-white/5 bg-white/2 flex justify-between items-center">
                    <span className="text-tiny text-gray-500  ">Reference Segment</span>
                    <button
                        onClick={onClose}
                        className="text-tiny font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
