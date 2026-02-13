import React from 'react';
import { AlertCircle, FileText, Database, Layers, Check, Copy, ArrowRight } from 'lucide-react';
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
    if (!isOpen) return null;

    const renderConflictDescription = () => {
        switch (conflict.type) {
            case 'exact_duplicate':
                return "This exact file already exists in this workspace.";
            case 'name_collision':
                return "A file with this name already exists in this workspace, but the content is different.";
            case 'content_collision':
                return `This file's content already exists in the Global Vault (Workspace: ${conflict.existing_doc?.workspace}).`;
            default:
                return "A conflict was detected.";
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={24} />
                    <div>
                        <h2 className="text-h4 font-bold text-white">Duplicate Detected</h2>
                        <p className="text-tiny text-red-500/80 font-medium  tracking-wider">{conflict.type.replace('_', ' ')}</p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-caption text-gray-300 mb-6">
                        {renderConflictDescription()} What would you like to do?
                    </p>

                    <div className="space-y-3">
                        {/* Option 1: Use Existing (Only for content/exact match) */}
                        {(conflict.type === 'content_collision' || conflict.type === 'exact_duplicate') && (
                            <button
                                onClick={() => onResolve('use_existing')}
                                disabled={isProcessing}
                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left flex items-start gap-4 group"
                            >
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <Database size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-caption font-bold text-white mb-1">Use Existing from Vault</h3>
                                    <p className="text-tiny text-gray-400">Avoid duplication by linking to the existing record and reusing its index.</p>
                                </div>
                                <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-500 transition-all self-center" />
                            </button>
                        )}

                        {/* Option 2: Rename */}
                        <button
                            onClick={() => onResolve('rename')}
                            disabled={isProcessing}
                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-left flex items-start gap-4 group"
                        >
                            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                                <Copy size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-caption font-bold text-white mb-1">Upload as a Copy</h3>
                                <p className="text-tiny text-gray-400">Rename this file to <span className="text-white font-mono">{conflict.suggested_name}</span> and store it separately.</p>
                            </div>
                            <ArrowRight size={16} className="text-gray-600 group-hover:text-yellow-500 transition-all self-center" />
                        </button>

                        {/* Option 3: Cancel (Hidden here, button below) */}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg text-caption font-medium text-gray-500 hover:text-white transition-all"
                    >
                        Cancel Upload
                    </button>
                </div>
            </div>
        </div>
    );
}
