'use client';

import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, Sparkles, Terminal, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/context/chat-context';

interface ChatMessageProps {
    message: Message;
    isLoading?: boolean;
    onCitationClick: (sourceId: number) => void;
    showReasoning?: boolean;
}

export function ChatMessage({ message, isLoading, onCitationClick }: ChatMessageProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderContent = (content: string) => {
        if (message.role === 'user') return content;

        // Regex to find [N] citations
        const parts = content.split(/(\[\d+\])/g);
        return parts.map((part, i) => {
            const match = part.match(/\[(\d+)\]/);
            if (match) {
                const id = parseInt(match[1]);
                const hasSource = message.sources?.some(s => s.id === id);

                return (
                    <button
                        key={i}
                        onClick={() => onCitationClick(id)}
                        disabled={!hasSource}
                        className={cn(
                            "inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold rounded-md mx-0.5 transition-all transform hover:-translate-y-0.5 active:scale-90 border",
                            hasSource
                                ? "bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white"
                                : "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed opacity-50"
                        )}
                    >
                        {id}
                    </button>
                );
            }
            return part;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-start gap-6 w-full group",
                message.role === 'user' ? "flex-row-reverse" : ""
            )}
        >
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl relative transition-transform group-hover:scale-110",
                message.role === 'user'
                    ? "bg-gradient-to-br from-indigo-600 to-purple-700 shadow-indigo-500/20"
                    : "bg-[#161619] border border-white/10 shadow-black/40"
            )}>
                {message.role === 'user' ? <User size={22} className="text-white" /> : <Bot size={22} className="text-blue-500" />}
                {message.role === 'assistant' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#0a0a0b]" />
                )}
            </div>

            <div className={cn(
                "flex flex-col gap-4 min-w-0 max-w-[85%]",
                message.role === 'user' ? "items-end text-right" : "items-start"
            )}>
                {/* Meta Header */}
                <div className="flex items-center gap-3 px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {message.role === 'assistant' && (message.reasoning_steps?.length || message.tools?.length) && (
                    <div className="w-full flex flex-col gap-3">
                        {/* Tools list */}
                        {message.tools && message.tools.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {message.tools.map((tool, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                                        <Terminal size={10} />
                                        {tool}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Reasoning steps */}
                        {(message.reasoning_steps?.length || 0) > 0 && (
                            <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-indigo-400/80 hover:bg-white/5 transition-all outline-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <Sparkles size={14} className="text-indigo-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/40">Thought</span>
                                        <span className="text-[9px] font-bold text-gray-600 ml-2">[{message.reasoning_steps?.length}]</span>
                                    </div>
                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-500">
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-6 pt-2 space-y-4">
                                                {message.reasoning_steps?.map((step, idx) => (
                                                    <div key={idx} className="flex gap-4 items-start group/step">
                                                        <div className="mt-1.5 shrink-0 flex flex-col items-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover/step:bg-indigo-500 transition-colors" />
                                                            {idx < (message.reasoning_steps?.length || 0) - 1 && (
                                                                <div className="w-px h-8 bg-indigo-500/10 mt-1" />
                                                            )}
                                                        </div>
                                                        <span className="text-tiny font-medium text-gray-500 leading-relaxed group-hover/step:text-gray-300 transition-colors">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}

                <div className={cn(
                    "p-4 rounded-xl leading-relaxed text-sm shadow-2xl transition-all relative overflow-hidden group/text",
                    message.role === 'user'
                        ? "bg-[#1c1c1e] border border-indigo-500/20 text-indigo-50 rounded-tr-none shadow-indigo-500/5"
                        : "bg-[#121214] border border-white/5 text-gray-200 rounded-tl-none shadow-black/60"
                )}>
                    <div className="relative z-10 whitespace-pre-wrap">
                        {renderContent(message.content) || (isLoading ? "..." : "")}
                    </div>

                    {message.role === 'assistant' && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                    )}
                </div>

                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                        {message.sources.map(source => (
                            <button
                                key={source.id}
                                onClick={() => onCitationClick(source.id)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:bg-blue-600/10 hover:border-blue-500/30 transition-all group/src"
                            >
                                <Shield size={10} className="text-gray-700 group-hover/src:text-blue-500" />
                                Source [{source.id}]
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="truncate max-w-[120px] normal-case font-medium text-gray-600 group-hover/src:text-gray-400">{source.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
