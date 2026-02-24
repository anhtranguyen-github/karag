'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, duration?: number) => string;
    dismiss: (id: string) => void;
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    loading: (message: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (type !== 'loading' && duration > 0) {
            setTimeout(() => dismiss(id), duration);
        }

        return id;
    }, [dismiss]);

    const success = useCallback((message: string, duration?: number) => toast(message, 'success', duration), [toast]);
    const error = useCallback((message: string, duration?: number) => toast(message, 'error', duration), [toast]);
    const loading = useCallback((message: string) => toast(message, 'loading', 0), [toast]);

    return (
        <ToastContext.Provider value={{ toast, dismiss, success, error, loading }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.2 } }}
                            className={cn(
                                "pointer-events-auto min-w-[300px] max-w-md p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4 group",
                                t.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                                t.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-400",
                                t.type === 'info' && "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
                                t.type === 'loading' && "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            )}
                        >
                            <div className="shrink-0">
                                {t.type === 'success' && <CheckCircle2 size={20} />}
                                {t.type === 'error' && <AlertCircle size={20} />}
                                {t.type === 'info' && <Info size={20} />}
                                {t.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
                            </div>

                            <div className="flex-1 text-xs font-bold tracking-tight leading-relaxed">
                                {t.message}
                            </div>

                            <button
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
