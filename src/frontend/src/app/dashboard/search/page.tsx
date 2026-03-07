"use client";

import React, { useState } from "react";
import {
    Search as SearchIcon,
    Send,
    Settings2,
    Database,
    Layers,
    Sparkles,
    ChevronDown,
    Info,
    Clock,
    Layout,
    FileText,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    vectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGet as vectorSearch,
} from "@/sdk/generated";
import { useParams } from "next/navigation";
import { useToast } from "@/context/toast-context";
import { useWorkspaces } from "@/hooks/use-workspaces";

export default function SearchPage() {
    const params = useParams();
    const { currentWorkspace } = useWorkspaces();
    const workspaceId = currentWorkspace?.id || params.workspaceId as string || "default";
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        try {
            setLoading(true);
            const startTime = performance.now();
            const response = await vectorSearch({ workspaceId, q: query });
            const endTime = performance.now();

            const data = (response.data as any) || [];
            setResults(data);
            toast.success(`Found ${data.length || 0} results in ${(endTime - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Search operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Search Playground</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Test your RAG pipelines and inspect retrieval quality.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-10 rounded-xl border-border bg-card gap-2 font-bold text-xs">
                        <Settings2 size={16} />
                        Parameters
                    </Button>
                </div>
            </div>

            {/* Main Search Bar */}
            <Card className="bg-card border-border shadow-2xl shadow-indigo-500/5 rounded-3xl overflow-hidden border-indigo-500/10">
                <CardContent className="p-0">
                    <form onSubmit={handleSearch} className="flex items-center p-4">
                        <SearchIcon className="ml-4 h-6 w-6 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask anything about your knowledge base..."
                            className="flex-1 h-14 bg-transparent border-none outline-none px-6 text-xl font-medium placeholder:text-muted-foreground/50"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                        </Button>
                    </form>

                    <div className="px-8 pb-4 flex items-center gap-6">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors">
                            <Database size={12} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">All Datasets</span>
                            <ChevronDown size={10} className="text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors">
                            <Layers size={12} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hybrid Search</span>
                            <ChevronDown size={10} className="text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors ml-auto">
                            <Sparkles size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Reasoning Off</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Section */}
            <div className="space-y-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-3xl bg-card/50 border border-border animate-pulse" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                            <Layout size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-muted-foreground">Ready for your query</h3>
                        <p className="max-w-xs mx-auto text-sm text-muted-foreground/60 mt-1 font-medium">
                            Enter a search term above to begin inspecting your retrieval pipeline.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Retrieved Results ({results.length})</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                <Info size={12} />
                                Sorted by relevance score
                            </div>
                        </div>

                        {results.map((result, idx) => (
                            <Card key={idx} className="bg-card/50 border-border border-l-4 border-l-indigo-500 overflow-hidden hover:bg-card transition-all duration-300 group">
                                <CardContent className="p-6">
                                    <div className="flex justify-between gap-6">
                                        <div className="flex-1 space-y-3">
                                            <p className="text-sm font-medium leading-relaxed text-foreground/90">
                                                {result.text}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/80 border border-border text-[10px] font-bold text-muted-foreground">
                                                    <FileText size={10} />
                                                    {result.metadata?.filename || "Source Document"}
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                                                    <Clock size={10} />
                                                    Page {result.metadata?.page || 1}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="p-3 rounded-2xl bg-secondary border border-border group-hover:border-indigo-500/30 transition-all">
                                                <p className="text-lg font-bold font-mono tracking-tighter">{(result.score || 0).toFixed(4)}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Score</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
