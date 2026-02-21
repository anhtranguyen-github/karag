"use client"
import * as React from "react"
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: React.ReactNode
    children: React.ReactNode
    className?: string
    containerClassName?: string
}

export function Modal({ isOpen, onClose, title, children, className, containerClassName }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={cn(
                            "relative w-full max-w-lg bg-background border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col",
                            className
                        )}
                    >
                        <div className="flex items-center justify-between p-8 pb-4 shrink-0 transition-all">
                            <h2 id="modal-title" className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-indigo-500/30 transition-all active:scale-90"
                            >
                                <X size={18} />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>
                        <div className={cn("flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar", containerClassName)}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
