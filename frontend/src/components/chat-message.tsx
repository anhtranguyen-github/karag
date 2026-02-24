'use client';

import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, Sparkles, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/context/chat-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

        // Pre-process content to handle [N] as markdown links for the component override
        // We look for [N] and replace with [N](#citation-N)
        const processedContent = content.replace(/\[(\d+)\]/g, '[$1](#citation-$1)');

        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    a: ({ href, children }) => {
                        if (href?.startsWith('#citation-')) {
                            const idStr = href.replace('#citation-', '');
                            const id = parseInt(idStr);
                            const hasSource = message.sources?.some(s => s.id === id);
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (hasSource) onCitationClick(id);
                                    }}
                                    disabled={!hasSource}
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 text-[10px] font-bold rounded-md mx-0.5 transition-all transform hover:-translate-y-0.5 active:scale-90 border",
                                        hasSource
                                            ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30 hover:bg-indigo-500 hover:text-white"
                                            : "bg-muted text-muted-foreground/40 border-border cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {id}
                                </button>
                            );
                        }
                        return <a href={href} className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                    },
                    table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-left text-xs border-collapse">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-secondary/50 font-bold">{children}</thead>,
                    th: ({ children }) => <th className="p-2 border-b border-border">{children}</th>,
                    td: ({ children }) => <td className="p-2 border-b border-border/50">{children}</td>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                    code: ({ children }) => <code className="bg-secondary px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>,
                    ul: ({ children }) => <ul className="list-disc ml-4 space-y-1 my-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 space-y-1 my-2">{children}</ol>,
                }}
            >
                {processedContent}
            </ReactMarkdown>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-end gap-4 w-full group py-2",
                message.role === 'user' ? "flex-row-reverse" : ""
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xl relative transition-transform group-hover:scale-105",
                message.role === 'user'
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-500/20"
                    : "bg-secondary border border-border shadow-black/40"
            )}>
                {message.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-indigo-500" />}
                {message.role === 'assistant' && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background" />
                )}
            </div>

            <div className={cn(
                "flex flex-col gap-2 min-w-0 max-w-[85%]",
                message.role === 'user' ? "items-end text-right" : "items-start"
            )}>
                {/* Meta Header */}
                <div className="flex items-center gap-3 px-1 text-[8px] font-bold text-muted-foreground opacity-50">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {message.role === 'assistant' && (message.reasoning_steps?.length) && (
                    <div className="w-full flex flex-col gap-2">
                        {/* Reasoning steps */}
                        {(message.reasoning_steps?.length || 0) > 0 && (
                            <div className="w-full overflow-hidden rounded-xl border border-border bg-secondary/30">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-indigo-500/80 hover:bg-secondary/50 transition-all outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={12} className="text-indigo-500" />
                                        <span className="text-[10px] font-bold text-indigo-500/70">Thinking</span>
                                        <span className="text-[9px] font-bold text-muted-foreground/50 ml-1">[{message.reasoning_steps?.length}]</span>
                                    </div>
                                    <div className="w-5 h-5 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground/60">
                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
                                            <div className="p-3 pt-1 space-y-1.5 border-t border-border/20">
                                                {message.reasoning_steps?.map((step, idx) => (
                                                    <div key={idx} className="flex gap-3 items-start group/step">
                                                        <div className="mt-1.5 shrink-0 flex flex-col items-center">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-500/30 group-hover/step:bg-indigo-500 transition-colors" />
                                                            {idx < (message.reasoning_steps?.length || 0) - 1 && (
                                                                <div className="w-px h-6 bg-border/50 mt-1" />
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-muted-foreground leading-snug group-hover/step:text-foreground transition-colors">{step}</span>
                                                    </div>
                                                ))}
                                                {isLoading && !message.content && (
                                                    <div className="flex gap-3 items-start group/step animate-pulse">
                                                        <div className="mt-1.5 shrink-0 flex flex-col items-center">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-500 transition-colors" />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-indigo-500 leading-snug">Processing...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content Bubble */}
                {(message.content || (isLoading && (!message.reasoning_steps || message.reasoning_steps.length === 0))) && (
                    <div className={cn(
                        "p-3.5 rounded-xl leading-relaxed text-[13px] shadow-2xl transition-all relative overflow-hidden group/text",
                        message.role === 'user'
                            ? "bg-indigo-600 border border-indigo-400/20 text-indigo-50 rounded-br-none shadow-indigo-500/5 hover:bg-indigo-500"
                            : "bg-card border border-border text-foreground rounded-tl-none shadow-black/40"
                    )}>
                        <div className="relative z-10 whitespace-pre-wrap">
                            {renderContent(message.content) || (isLoading ? "..." : "")}
                        </div>

                        {message.role === 'assistant' && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                        )}
                    </div>
                )}

                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-0.5">
                        {message.sources.map(source => (
                            <button
                                key={source.id}
                                onClick={() => onCitationClick(source.id)}
                                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[9px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all group/src"
                            >
                                <Shield size={9} className="text-muted-foreground/40 group-hover/src:text-indigo-500" />
                                <span className="text-indigo-500/60 font-black">[{source.id}]</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                <span className="truncate max-w-[100px] normal-case font-medium group-hover/src:text-foreground">{source.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
