'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatContext } from '@/context/chat-context';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/components/chat-message';
import { CitationModal } from '@/components/chat/citation';
import {
    Send, Bot, Loader2, Zap, Brain, MessageSquare,
    Plus, Trash2, History, X, ChevronRight, Hash, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ChatMode = 'fast' | 'thinking' | 'reasoning';

export default function ChatPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const {
        messages, threadId, isLoading, threads, isLoadingThreads,
        setThreadId, sendMessage, clearChat, fetchThreads, deleteThread
    } = useChatContext();

    const { settings, updateSettings } = useSettings();

    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ChatMode>('fast');
    const [activeSource, setActiveSource] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial fetch
    useEffect(() => {
        if (workspaceId) {
            fetchThreads(workspaceId);
        }
    }, [workspaceId, fetchThreads]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Sync mode with settings
    useEffect(() => {
        if (settings?.show_reasoning) {
            setMode('reasoning');
        }
    }, [settings]);

    const handleModeChange = async (newMode: ChatMode) => {
        setMode(newMode);
        if (updateSettings) {
            await updateSettings({ show_reasoning: newMode === 'reasoning' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input, workspaceId);
        setInput('');
    };

    const startNewChat = () => {
        clearChat(workspaceId);
        setShowHistory(false);
    };

    const modeOptions = [
        { id: 'fast', label: 'Speed', icon: Zap, description: 'Optimized response latency' },
        { id: 'thinking', label: 'Deep', icon: Brain, description: 'Enhanced logical analysis' },
        { id: 'reasoning', label: 'Verifiable', icon: MessageSquare, description: 'Exposed chain-of-thought' },
    ];

    return (
        <div className="flex-1 flex h-full relative overflow-hidden bg-[#0a0a0b]">
            {/* History Sidebar - Drawer */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                        />
                        <motion.aside
                            initial={{ x: -400 }}
                            animate={{ x: 0 }}
                            exit={{ x: -400 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 left-0 w-[400px] bg-[#0d0d0e] border-r border-white/5 z-[100] shadow-3xl flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                                        <History size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-caption font-black text-white uppercase tracking-widest">Chronicle</h3>
                                        <p className="text-[10px] text-gray-500 font-bold">Historical Context Modules</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <button
                                    onClick={startNewChat}
                                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-tiny font-black tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} />
                                    INITIALIZE NEW SESSION
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2">
                                {isLoadingThreads ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <span className="text-tiny font-black tracking-widest">RETRIEVING LOGS...</span>
                                    </div>
                                ) : threads.length === 0 ? (
                                    <div className="text-center py-20 px-10">
                                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 text-gray-700">
                                            <Database size={24} />
                                        </div>
                                        <p className="text-gray-500 text-tiny font-bold uppercase tracking-widest">No prior dialogues found</p>
                                    </div>
                                ) : (
                                    threads.map((thread) => (
                                        <div
                                            key={thread.id}
                                            onClick={() => { setThreadId(thread.id); setShowHistory(false); }}
                                            className={cn(
                                                "w-full p-5 rounded-2xl flex flex-col gap-3 transition-all cursor-pointer group border relative overflow-hidden",
                                                threadId === thread.id
                                                    ? "bg-blue-600/10 border-blue-500/30 text-white"
                                                    : "bg-white/[0.02] border-white/5 hover:border-white/10 text-gray-400"
                                            )}
                                        >
                                            <div className="flex items-center justify-between z-10">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full shrink-0",
                                                        threadId === thread.id ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-gray-800"
                                                    )} />
                                                    <h4 className="text-caption font-black truncate">{thread.title || "UNTITLED SESSION"}</h4>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
                                                    className="p-2 rounded-lg bg-black/40 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-600 z-10">
                                                <span>{new Date(thread.last_active).toLocaleDateString()}</span>
                                                <span>{thread.message_count} Transmissions</span>
                                            </div>
                                            {threadId === thread.id && (
                                                <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[2px]" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Chat Core */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0b]/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all transform active:scale-95 group"
                        >
                            <History size={18} className="group-hover:rotate-[-45deg] transition-transform" />
                            <span className="text-tiny font-black tracking-widest uppercase">Archive</span>
                        </button>
                        <div className="h-6 w-px bg-white/5" />
                        <div>
                            <h2 className="text-caption font-black text-white uppercase tracking-widest flex items-center gap-2">
                                System Interface
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            </h2>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Active Link Protocol</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {threadId && (
                            <div className="px-4 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-3">
                                <Hash size={14} className="text-indigo-400" />
                                <span className="text-[10px] font-mono text-indigo-400/80">{threadId.substring(0, 12)}</span>
                            </div>
                        )}
                        <button
                            onClick={() => clearChat(workspaceId)}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Purge Current Buffer"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </header>

                {/* Content Stream */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 scroll-smooth"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                            <div className="w-24 h-24 rounded-[3rem] bg-blue-600/10 flex items-center justify-center border border-blue-500/20 text-blue-500 shadow-3xl shadow-blue-500/5 animate-pulse">
                                <Bot size={48} />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-h2 font-black text-white uppercase tracking-tighter">Awaiting Input</h2>
                                <p className="text-caption text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
                                    Initiate a cognitive transmission by asking a question about your indexed knowledge bases.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                                {[
                                    "Identify key relationships in document cluster",
                                    "Synthesize summary of latest research notes",
                                    "List identified contradictions across sources",
                                    "Project possible outcomes based on dataset"
                                ].map(prompt => (
                                    <button
                                        key={prompt}
                                        onClick={() => sendMessage(prompt, workspaceId)}
                                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-tiny font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-blue-500/30 hover:bg-blue-600/5 transition-all text-left flex items-center justify-between group"
                                    >
                                        <span className="max-w-[200px]">{prompt}</span>
                                        <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all text-blue-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto w-full space-y-12 pb-10">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    showReasoning={mode === 'reasoning'}
                                    isLoading={isLoading && message.id === messages[messages.length - 1].id}
                                    onCitationClick={(id) => {
                                        const source = message.sources?.find(s => s.id === id);
                                        if (source) setActiveSource(source);
                                    }}
                                />
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-4 text-gray-500 animate-pulse">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <Loader2 size={18} className="animate-spin text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Processing Logic...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Matrix */}
                <footer className="p-8 bg-[#0a0a0b]/80 backdrop-blur-xl border-t border-white/5">
                    <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        {/* Cognitive Modes */}
                        <div className="flex items-center justify-center">
                            <div className="flex gap-2 p-1.5 bg-[#121214] border border-white/5 rounded-2xl">
                                {modeOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleModeChange(opt.id as ChatMode)}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-2.5 rounded-xl text-tiny font-black uppercase tracking-widest transition-all relative group",
                                            mode === opt.id
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
                                        )}
                                    >
                                        <opt.icon size={14} className={cn(mode === opt.id ? "text-white" : "text-gray-700")} />
                                        <span>{opt.label}</span>
                                        {mode === opt.id && (
                                            <motion.div layoutId="mode-accent" className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-[#0a0a0b] shadow-[0_0_8px_#60a5fa]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="flex items-center gap-4 bg-[#121214] border border-white/10 group-focus-within:border-blue-500/40 rounded-3xl p-3 transition-all ring-0 focus-within:ring-8 ring-blue-500/5 shadow-2xl">
                                <div className="pl-5 text-gray-700">
                                    {mode === 'fast' ? <Zap size={20} /> : mode === 'thinking' ? <Brain size={20} /> : <MessageSquare size={20} />}
                                </div>
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={`Transmit message to cognitive core...`}
                                    className="flex-1 bg-transparent border-none focus:outline-none py-4 px-2 text-caption text-white placeholder:text-gray-700 font-medium"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className={cn(
                                        "w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all",
                                        input.trim()
                                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 scale-100 hover:scale-105 active:scale-95"
                                            : "bg-white/5 text-gray-700 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-10">
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.3em]">
                                    Press Enter to transmit
                                </p>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <p className="text-[9px] text-blue-500/60 font-black uppercase tracking-[0.3em]">
                                    {modeOptions.find(o => o.id === mode)?.description}
                                </p>
                            </div>
                        </form>
                    </div>
                </footer>
            </div>

            {/* Citation Matrix */}
            <AnimatePresence>
                {activeSource && (
                    <CitationModal
                        source={activeSource}
                        onClose={() => setActiveSource(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
