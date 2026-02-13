import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/hooks/use-chat';

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
                return (
                    <button
                        key={i}
                        onClick={() => onCitationClick(id)}
                        className="inline-flex items-center justify-center w-5 h-5 text-tiny font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md mx-0.5 hover:bg-blue-600/40 hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-90"
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-start gap-5 max-w-4xl mx-auto",
                message.role === 'user' ? "flex-row-reverse" : ""
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                message.role === 'user' ? "bg-purple-600 shadow-purple-500/20" : "bg-[#1e1e21] border border-white/10 shadow-black/40"
            )}>
                {message.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-blue-500" />}
            </div>

            <div className="flex flex-col gap-3 min-w-0 flex-1">
                {message.role === 'assistant' && (message.reasoning_steps?.length || message.tools?.length) && (
                    <div className="flex flex-col gap-2 mb-1">
                        <div className="flex flex-wrap gap-2">
                            {message.tools?.map((tool, idx) => (
                                <span key={idx} className="text-tiny font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
                                    {tool}
                                </span>
                            ))}
                        </div>

                        {(message.reasoning_steps?.length || 0) > 0 && (
                            <div className="w-full mt-1 overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="flex items-center gap-2 text-indigo-400 font-bold   text-tiny hover:text-indigo-300 transition-colors py-1 focus:outline-none"
                                >
                                    <span>Thinking Process:</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    <span className="text-tiny font-normal opacity-50 ml-1">
                                        ({message.reasoning_steps?.length} steps)
                                    </span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/5 text-caption text-gray-400 font-medium shadow-inner ring-1 ring-white/5">
                                                <ul className="space-y-2">
                                                    {message.reasoning_steps?.map((step, idx) => (
                                                        <li key={idx} className="flex gap-3 items-start">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 mt-1.5 shrink-0" />
                                                            <span className="leading-relaxed">{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}

                <div className={cn(
                    "p-6 rounded-3xl leading-relaxed text-body shadow-sm whitespace-pre-wrap transition-all",
                    message.role === 'user'
                        ? "bg-[#1e1e21] border border-purple-500/20 text-gray-100 rounded-tr-none"
                        : "bg-[#161619] border border-white/5 text-gray-200 rounded-tl-none"
                )}>
                    {renderContent(message.content) || (isLoading ? "..." : "")}
                </div>
            </div>
        </motion.div>
    );
}
