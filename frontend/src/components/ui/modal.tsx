"use client"
import * as React from "react"
import { X } from "lucide-react";
import { Button } from "./button";

import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={cn("bg-background w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200", className)}>
                <div className="flex items-center justify-between p-8 pb-0">
                    <h2 id="modal-title" className="text-xl font-bold tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                        >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}
