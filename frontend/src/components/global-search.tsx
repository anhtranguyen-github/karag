'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, MessageSquare, Database, Layout, Loader2, Command } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface SearchResultItem {
    id: string;
    name: string;
    [key: string]: unknown;
}

interface SearchResults {
    workspaces: SearchResultItem[];
    threads: SearchResultItem[];
    documents: SearchResultItem[];
}

export function GlobalSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'workspaces' | 'threads' | 'documents'>('all');
    const router = useRouter();

    const handleSearch = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults(null);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_ROUTES.SEARCH}?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const rawData = await res.json();

                // Runtime Validation
                const { AppResponseSchema } = await import('@/lib/schemas/api');
                const { SearchResultsSchema } = await import('@/lib/schemas/search');

                const ResponseSchema = AppResponseSchema(SearchResultsSchema);
                const result = ResponseSchema.safeParse(rawData);

                if (!result.success) {
                    console.error("API Contract Violation (Search):", result.error);
                    return;
                }

                const payload = result.data;
                if (payload.success && payload.data) {
                    setResults(payload.data);
                }
            }
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) handleSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, handleSearch]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const navigateTo = (type: string, id: string, extra?: { workspace_id?: string }) => {
        onClose();
        if (type === 'workspace') {
            router.push(`/workspaces/${id}`);
        } else if (type === 'thread' && extra?.workspace_id) {
            localStorage.setItem('chat_thread_id', id);
            router.push(`/workspaces/${extra.workspace_id}`);
        } else if (type === 'document' && extra?.workspace_id) {
            router.push(`/workspaces/${extra.workspace_id}`);
        }
    };

    if (!isOpen) return null;

    const hasResults = results && (results.workspaces.length > 0 || results.threads.length > 0 || results.documents.length > 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                    <Search className={cn("w-6 h-6", isLoading ? "text-indigo-500 animate-pulse" : "text-gray-500")} />
                    <input
                        autoFocus
                        placeholder="Search for chats, files, or environments..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-h3 font-medium text-white placeholder:text-gray-700"
                    />
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    ) : (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-tiny font-bold text-gray-500  ">
                            <Command size={10} /> Esc
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-6 py-3 bg-white/[0.02] border-b border-white/5">
                    {(['all', 'workspaces', 'threads', 'documents'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-tiny font-bold   transition-all",
                                activeFilter === filter
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {!query && (
                        <div className="p-12 text-center text-gray-600">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-caption">Type to begin a global search across your workspace</p>
                        </div>
                    )}

                    {query && !isLoading && !hasResults && (
                        <div className="p-12 text-center text-gray-600 font-medium">
                            No results found for "{query}"
                        </div>
                    )}

                    <div className="space-y-4 p-2">
                        {/* Workspaces */}
                        {(activeFilter === 'all' || activeFilter === 'workspaces') && (results?.workspaces?.length ?? 0) > 0 && (
                            <section>
                                <h3 className="px-4 py-2 text-tiny font-bold text-gray-600  ">Environments</h3>
                                {results?.workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => navigateTo('workspace', ws.id)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <Layout size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{ws.name}</div>
                                            <div className="text-tiny text-gray-500 truncate">{(ws.description as string) || 'No description'}</div>
                                        </div>
                                    </button>
                                ))}
                            </section>
                        )}

                        {/* Threads */}
                        {(activeFilter === 'all' || activeFilter === 'threads') && (results?.threads?.length ?? 0) > 0 && (
                            <section>
                                <h3 className="px-4 py-2 text-tiny font-bold text-gray-600  ">Conversations</h3>
                                {results?.threads.map((thread) => (
                                    <button
                                        key={thread.id}
                                        onClick={() => navigateTo('thread', thread.id, { workspace_id: thread.workspace_id as string })}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{(thread.title as string)}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(thread.tags as string[])?.map((tag: string) => (
                                                    <span key={tag} className="text-tiny px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500 font-bold   whitespace-nowrap border border-white/5">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </section>
                        )}

                        {/* Documents */}
                        {(activeFilter === 'all' || activeFilter === 'documents') && (results?.documents?.length ?? 0) > 0 && (
                            <section>
                                <h3 className="px-4 py-2 text-tiny font-bold text-gray-600  ">Resources</h3>
                                {results?.documents.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => navigateTo('document', doc.id, { workspace_id: doc.workspace_id as string })}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <Database size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-white group-hover:text-purple-400 transition-colors truncate">{doc.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-tiny font-bold text-gray-600  ">{(doc.extension as string)}</span>
                                                <span className="text-tiny font-bold text-indigo-500  ">{(doc.workspace_id as string)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </section>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
