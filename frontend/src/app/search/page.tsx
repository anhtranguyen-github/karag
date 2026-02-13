'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Search, FileText, MessageSquare,
    Loader2, X, ArrowRight, Clock, Box
} from 'lucide-react';
import { API_BASE_URL, API_ROUTES } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type SearchScope = 'all' | 'documents' | 'chats' | 'workspaces';

interface SearchResult {
    type: 'document' | 'chat' | 'workspace';
    id: string;
    title: string;
    snippet: string;
    workspace_id?: string;
    workspace_name?: string;
    created_at?: string;
    score?: number;
}

interface SearchWorkspace {
    id: string;
    name: string;
    description?: string;
    stats?: { doc_count: number };
}

interface SearchDoc {
    id?: string;
    filename: string;
    snippet?: string;
    workspace_id: string;
    created_at?: string;
    score?: number;
}

function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [scope, setScope] = useState<SearchScope>('all');
    const [workspaceFilter, setWorkspaceFilter] = useState<string>('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [workspaces, setWorkspaces] = useState<SearchWorkspace[]>([]);

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    // Fetch workspaces for filter
    useEffect(() => {
        const loadWorkspaces = async () => {
            try {
                const res = await fetch(API_ROUTES.WORKSPACES);
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        setWorkspaces(result.data);
                    }
                }
            } catch (err) {
                console.error('Failed to load workspaces', err);
            }
        };
        loadWorkspaces();
    }, []);

    // Search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const allResults: SearchResult[] = [];

        try {
            const wsParam = workspaceFilter ? `&workspace_id=${encodeURIComponent(workspaceFilter)}` : '';
            const res = await fetch(`${API_ROUTES.SEARCH}?q=${encodeURIComponent(searchQuery)}${wsParam}`);

            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    const data = result.data;

                    // Documents
                    if ((scope === 'all' || scope === 'documents') && data.documents) {
                        data.documents.forEach((doc: any) => {
                            allResults.push({
                                type: 'document',
                                id: doc.id,
                                title: doc.name,
                                snippet: `Document in ${doc.workspace_id}`,
                                workspace_id: doc.workspace_id,
                                score: 1.0 // Mock score as regex search doesn't provide one
                            });
                        });
                    }

                    // Workspaces
                    if ((scope === 'all' || scope === 'workspaces') && data.workspaces) {
                        data.workspaces.forEach((ws: any) => {
                            allResults.push({
                                type: 'workspace',
                                id: ws.id,
                                title: ws.name,
                                snippet: ws.description || 'Workspace',
                                workspace_id: ws.id
                            });
                        });
                    }

                    // Threads
                    if ((scope === 'all' || scope === 'chats') && data.threads) {
                        data.threads.forEach((thread: any) => {
                            allResults.push({
                                type: 'chat',
                                id: thread.id,
                                title: thread.title || 'Untitled Chat',
                                snippet: `Thread in ${thread.workspace_id}`,
                                workspace_id: thread.workspace_id
                            });
                        });
                    }
                }
            }

            // Sort results
            setResults(allResults);

            // Save to recent searches
            if (searchQuery.trim()) {
                const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
                setRecentSearches(updated);
                localStorage.setItem('recentSearches', JSON.stringify(updated));
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, [scope, workspaceFilter, recentSearches]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) {
                performSearch(query);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const handleResultClick = (result: SearchResult) => {
        switch (result.type) {
            case 'document':
                router.push(`/workspaces/${result.workspace_id}/documents/${result.id}`);
                break;
            case 'chat':
                router.push(`/workspaces/${result.workspace_id}/chat/${result.id}`);
                break;
            case 'workspace':
                router.push(`/workspaces/${result.id}`);
                break;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'document': return FileText;
            case 'chat': return MessageSquare;
            case 'workspace': return Box;
            default: return FileText;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'document': return 'text-blue-500 bg-blue-500/10';
            case 'chat': return 'text-green-500 bg-green-500/10';
            case 'workspace': return 'text-purple-500 bg-purple-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/" className="text-gray-500 hover:text-white transition-all">
                            ← Back
                        </Link>
                        <h1 className="text-h3 font-bold">Search</h1>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search documents, chats, workspaces..."
                            className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/5 border border-white/10 text-h3 focus:outline-none focus:ring-2 ring-blue-500/50"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setResults([]); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="border-b border-white/10 px-6 py-3">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    {/* Scope Filter */}
                    <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                        {(['all', 'documents', 'chats', 'workspaces'] as SearchScope[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-caption capitalize transition-all",
                                    scope === s
                                        ? "bg-white/10 text-white"
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Workspace Filter */}
                    <select
                        value={workspaceFilter}
                        onChange={(e) => setWorkspaceFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-caption text-gray-300 focus:outline-none"
                    >
                        <option value="">All Workspaces</option>
                        {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results */}
            <main className="max-w-4xl mx-auto p-6">
                {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : query ? (
                    results.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-caption text-gray-500 mb-4">{results.length} results found</p>
                            {results.map((result) => {
                                const Icon = getTypeIcon(result.type);
                                return (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full flex items-center gap-4 p-4 bg-[#121214] rounded-xl border border-white/5 hover:border-white/10 transition-all text-left group"
                                    >
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getTypeColor(result.type))}>
                                            <Icon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-white truncate">{result.title}</h3>
                                                <span className="text-tiny text-gray-600 ">{result.type}</span>
                                            </div>
                                            <p className="text-caption text-gray-500 truncate">{result.snippet}</p>
                                            {result.workspace_id && result.type !== 'workspace' && (
                                                <p className="text-tiny text-gray-600 mt-1">Workspace: {result.workspace_id}</p>
                                            )}
                                        </div>
                                        <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-500 transition-all" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No results found for "{query}"</p>
                            <p className="text-caption text-gray-600 mt-1">Try different keywords or adjust filters</p>
                        </div>
                    )
                ) : (
                    /* Recent Searches */
                    recentSearches.length > 0 && (
                        <div>
                            <h3 className="text-caption font-medium text-gray-400 mb-3 flex items-center gap-2">
                                <Clock size={14} />
                                Recent Searches
                            </h3>
                            <div className="space-y-2">
                                {recentSearches.map((search, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuery(search)}
                                        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-all text-left"
                                    >
                                        <Search size={14} className="text-gray-500" />
                                        <span className="text-gray-300">{search}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

export default function SearchPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <SearchContent />
        </React.Suspense>
    );
}
