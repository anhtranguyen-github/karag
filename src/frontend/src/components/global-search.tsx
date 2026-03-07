'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { Search, MessageSquare, Database, Layout, Loader2, Command, Globe, Hash, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface SearchResultItem {
    id: string;
    name: string;
    workspace_id?: string;
    title?: string | null;
    tags?: string[];
    description?: string | null;
    extension?: string | null;
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

    const hasResults = results && (results.workspaces.length > 0 || results.threads.length > 0 || results.documents.length > 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <Search size={16} />
                    </div>
                    <span>Search</span>
                </div>
            )}
            className="max-w-3xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col h-[650px]">
                {/* Search Input Area */}
                <div className="px-8 pt-2 pb-6">
                    <div className="relative group">
                        <input
                            autoFocus
                            placeholder="Search chats, files, or workspaces..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-14 bg-secondary/40 border border-border rounded-2xl pl-6 pr-24 text-lg font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-muted-foreground/30"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary border border-border text-[9px] font-black text-muted-foreground tracking-widest">
                                    <Command size={10} /> Esc
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 px-8 py-3 border-b border-border bg-black/5">
                    {(['all', 'workspaces', 'threads', 'documents'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all",
                                activeFilter === filter
                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Results Section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {!query && (
                        <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center text-indigo-500">
                                <Zap size={40} />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-foreground mb-1 tracking-widest">Search is ready</p>
                                <p className="text-[10px] text-muted-foreground font-medium">Type to start searching</p>
                            </div>
                        </div>
                    )}

                    {query && !isLoading && !hasResults && (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                            <Sparkles size={32} className="text-muted-foreground" />
                            <p className="text-xs font-medium">No matches found for "{query}" in your workspaces.</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Workspaces */}
                        {(activeFilter === 'all' || activeFilter === 'workspaces') && (results?.workspaces?.length ?? 0) > 0 && (
                            <section className="space-y-2">
                                <header className="px-3 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">Workspaces</span>
                                    <span className="text-[9px] font-bold text-indigo-500/50">{results?.workspaces.length} matches</span>
                                </header>
                                {results?.workspaces.map((ws) => (
                                    <SearchItem
                                        key={ws.id}
                                        icon={Layout}
                                        title={ws.name}
                                        subtitle={ws.description || 'No node description available.'}
                                        badge="workspace"
                                        onClick={() => navigateTo('workspace', ws.id)}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Threads */}
                        {(activeFilter === 'all' || activeFilter === 'threads') && (results?.threads?.length ?? 0) > 0 && (
                            <section className="space-y-2">
                                <header className="px-3 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">Chats</span>
                                    <span className="text-[9px] font-bold text-blue-500/50">{results?.threads.length} matches</span>
                                </header>
                                {results?.threads.map((thread) => (
                                    <SearchItem
                                        key={thread.id}
                                        icon={MessageSquare}
                                        title={thread.title as string}
                                        subtitle={`Context: ${thread.workspace_id}`}
                                        badge="chat"
                                        color="blue"
                                        onClick={() => navigateTo('thread', thread.id, { workspace_id: thread.workspace_id as string })}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Documents */}
                        {(activeFilter === 'all' || activeFilter === 'documents') && (results?.documents?.length ?? 0) > 0 && (
                            <section className="space-y-2">
                                <header className="px-3 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">Files</span>
                                    <span className="text-[9px] font-bold text-amber-500/50">{results?.documents.length} matches</span>
                                </header>
                                {results?.documents.map((doc) => (
                                    <SearchItem
                                        key={doc.id}
                                        icon={Database}
                                        title={doc.name}
                                        subtitle={`${doc.extension} • Artifact in ${doc.workspace_id}`}
                                        badge="file"
                                        color="amber"
                                        onClick={() => navigateTo('document', doc.id, { workspace_id: doc.workspace_id as string })}
                                    />
                                ))}
                            </section>
                        )}
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-center gap-2">
                    <Globe size={12} className="text-muted-foreground opacity-40" />
                    <span className="text-[9px] font-black text-muted-foreground/60 tracking-widest">Search engine</span>
                </div>
            </div>
        </Modal>
    );
}

function SearchItem({
    icon: Icon,
    title,
    subtitle,
    badge,
    onClick,
    color = "indigo"
}: {
    icon: any,
    title: string,
    subtitle: string,
    badge: string,
    onClick: () => void,
    color?: "indigo" | "blue" | "amber"
}) {
    const colorClasses = {
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20"
    };

    return (
        <button
            onClick={onClick}
            className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-secondary/20 border border-border hover:border-indigo-500/30 hover:bg-secondary/40 transition-all text-left"
        >
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110",
                colorClasses[color]
            )}>
                <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-foreground text-sm truncate group-hover:text-indigo-400 transition-colors tracking-tight">{title}</span>
                    <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded border tracking-widest",
                        colorClasses[color]
                    )}>{badge}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">{subtitle}</p>
            </div>
        </button>
    );
}
