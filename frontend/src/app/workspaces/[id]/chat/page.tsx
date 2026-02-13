'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useChat, Message } from '@/hooks/use-chat';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { API_ROUTES } from '@/lib/api-config';
import {
    Send, Bot, Loader2, Zap, Brain, MessageSquare,
    Plus, Trash2, History, X
} from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { CitationModal } from '@/components/chat/citation';

type ChatMode = 'fast' | 'thinking' | 'reasoning';

interface Thread {
    id: string;
    title?: string | null;
    last_active: string;
    message_count: number;
}

interface Source {
    id: number;
    name: string;
    content: string;
}

export default function ChatPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { messages, isLoading, sendMessage, clearChat, threadId, setThreadId } = useChat(workspaceId);
    const { settings, updateSettings } = useSettings();

    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ChatMode>('fast');
    const [activeSource, setActiveSource] = useState<Source | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Fetch threads when history panel opens
    const fetchThreads = useCallback(async () => {
        setIsLoadingThreads(true);
        try {
            const res = await fetch(API_ROUTES.CHAT_THREADS + `?workspace_id=${encodeURIComponent(workspaceId)}`);
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setThreads(result.data);
                } else {
                    console.error('API Error:', result.message);
                }
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoadingThreads(false);
        }
    }, [workspaceId]);

    // Fetch threads when history panel opens
    useEffect(() => {
        if (showHistory) {
            fetchThreads();
        }
    }, [showHistory, fetchThreads]);

    const selectThread = (id: string) => {
        setThreadId(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`chat_thread_id_${workspaceId}`, id);
        }
        setShowHistory(false);
    };

    const deleteThread = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(API_ROUTES.THREAD_DELETE(id), { method: 'DELETE' });
            if (res.ok) {
                setThreads(prev => prev.filter(t => t.id !== id));
                if (threadId === id) {
                    clearChat();
                }
            }
        } catch (err) {
            console.error('Failed to delete thread', err);
        }
    };

    const startNewChat = () => {
        clearChat();
        setShowHistory(false);
    };

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
        sendMessage(input);
        setInput('');
    };

    const handleCitationClick = (id: number, message: Message) => {
        const source = message.sources?.find((s: Source) => s.id === id);
        if (source) {
            setActiveSource(source);
        }
    };

    const modeOptions = [
        { id: 'fast', label: 'Fast', icon: Zap, description: 'Quick responses' },
        { id: 'thinking', label: 'Thinking', icon: Brain, description: 'Deliberate analysis' },
        { id: 'reasoning', label: 'Reasoning', icon: MessageSquare, description: 'Show thought process' },
    ];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 flex h-full relative">
            {/* History Sidebar - Drawer Style */}
            <aside className={cn(
                "fixed inset-y-0 left-0 w-80 bg-[#0a0a0b]/95 backdrop-blur-2xl border-r border-white/10 z-[100] transition-all duration-500 ease-in-out shadow-[20px_0_50px_rgba(0,0,0,0.5)]",
                showHistory ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
            )}>
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <History size={18} className="text-blue-500" />
                        </div>
                        <h3 className="text-caption font-bold text-white  ">Archive</h3>
                    </div>
                    <button
                        onClick={() => setShowHistory(false)}
                        className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-caption font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} />
                        New Conversation
                    </button>
                </div>

                <div className="overflow-y-auto h-[calc(100%-180px)] px-3 custom-scrollbar">
                    {isLoadingThreads ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="text-tiny font-medium  ">Indexing Threads...</span>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={20} className="text-gray-700" />
                            </div>
                            <p className="text-gray-500 text-tiny font-medium">Your conversation history will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {threads.map((thread) => (
                                <div
                                    key={thread.id}
                                    onClick={() => selectThread(thread.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-xl text-left transition-all group border cursor-pointer select-none",
                                        threadId === thread.id
                                            ? "bg-blue-500/10 border-blue-500/30 text-white ring-1 ring-blue-500/20"
                                            : "hover:bg-white/5 border-transparent text-gray-400"
                                    )}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                threadId === thread.id ? "bg-blue-500 shadow-[0_0_5px_#3b82f6]" : "bg-gray-700"
                                            )} />
                                            <p className="text-caption font-semibold truncate">
                                                {thread.title || 'Untitled Session'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-tiny text-gray-500 font-medium">
                                            <span>{formatDate(thread.last_active)}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                                            <span>{thread.message_count} messages</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => deleteThread(thread.id, e)}
                                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <header className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0b]/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                                showHistory
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                            )}
                        >
                            <History size={18} />
                            <span className="text-caption font-medium">History</span>
                        </button>

                        <div className="h-4 w-px bg-white/10" />

                        <div className="flex flex-col">
                            <h2 className="text-caption font-semibold text-white">Chat Session</h2>
                            <p className="text-tiny text-gray-500  tracking-wider">Workspace: {workspaceId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {threadId && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-tiny text-blue-400">ID: {threadId.substring(0, 8)}</span>
                            </div>
                        )}
                        <button
                            onClick={clearChat}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                            title="Clear Current Session"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-4">
                                <Bot size={32} className="text-blue-500" />
                            </div>
                            <h2 className="text-h3 font-bold text-white mb-2">Start a Conversation</h2>
                            <p className="text-gray-500 max-w-md">
                                Ask questions about your documents. Citations will appear inline when knowledge is retrieved.
                            </p>

                            {/* Quick Start Options */}
                            <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
                                {['Summarize my documents', 'Find related concepts', 'Explain this topic', 'Compare sources'].map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => sendMessage(prompt)}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-caption text-gray-400 hover:text-white transition-all text-left"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                showReasoning={mode === 'reasoning'}
                                isLoading={isLoading && message.id === messages[messages.length - 1].id}
                                onCitationClick={(id) => handleCitationClick(id, message)}
                            />
                        ))
                    )}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Loader2 size={16} className="text-blue-500 animate-spin" />
                            </div>
                            <span className="text-caption">
                                {mode === 'reasoning' ? 'Reasoning...' : mode === 'thinking' ? 'Thinking...' : 'Processing...'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Input */}
                <footer className="p-6 border-t border-white/10 mt-auto">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {/* Mode Selector in Tray */}
                        <div className="flex items-center gap-3 justify-center mb-1">
                            <div className="flex gap-1 p-1 bg-black/40 border border-white/5 rounded-xl">
                                {modeOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleModeChange(opt.id as ChatMode)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-lg text-caption transition-all group relative",
                                            mode === opt.id
                                                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <opt.icon size={14} className={cn(mode === opt.id ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400")} />
                                        <span className="font-medium">{opt.label}</span>
                                        {mode === opt.id && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="flex items-center gap-3 bg-[#121214] border border-white/10 group-focus-within:border-blue-500/50 rounded-2xl p-2.5 transition-all shadow-2xl">
                                <div className="pl-4 text-gray-500">
                                    {mode === 'fast' ? <Zap size={18} /> : mode === 'thinking' ? <Brain size={18} /> : <MessageSquare size={18} />}
                                </div>
                                <input
                                    id="chat-input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={`Message in ${mode} mode...`}
                                    className="flex-1 bg-transparent border-none focus:outline-none py-3 px-2 text-white placeholder:text-gray-600 text-caption"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className={cn(
                                        "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                                        input.trim()
                                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                            : "bg-white/5 text-gray-600 cursor-not-allowed"
                                    )}
                                    aria-label="Send message"
                                >
                                    {isLoading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Send size={20} />
                                    )}
                                </button>
                            </div>
                            <p className="mt-3 text-tiny text-center text-gray-600  tracking-[0.2em] font-medium">
                                Press Enter to send • {modeOptions.find(o => o.id === mode)?.description}
                            </p>
                        </form>
                    </div>
                </footer>
            </div>

            {/* Overlay for sidebar */}
            {showHistory && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-500"
                    onClick={() => setShowHistory(false)}
                />
            )}

            {/* Citation Modal */}
            {activeSource && (
                <CitationModal
                    source={activeSource}
                    onClose={() => setActiveSource(null)}
                />
            )}
        </div>
    );
}
