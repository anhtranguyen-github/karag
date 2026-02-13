'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Terminal } from 'lucide-react';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    details?: string;
}

export function ErrorModal({ isOpen, onClose, title = "System Notification", message, details }: ErrorModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#121214] border border-red-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden"
                    >
                        {/* Header/Banner */}
                        <div className="h-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient-x" />

                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <ShieldAlert className="text-red-500 w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-h3 font-bold text-white tracking-tight">{title}</h2>
                                    <p className="text-tiny text-red-400 font-bold  ">Action Required</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-gray-300 leading-relaxed">
                                    {message}
                                </p>

                                {details && (
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-tiny text-gray-500 break-all flex gap-3">
                                        <Terminal size={14} className="shrink-0 mt-0.5" />
                                        <span>{details}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-white text-black hover:bg-gray-200 transition-all py-3 rounded-xl text-caption font-bold active:scale-95"
                                >
                                    Acknowledge
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
