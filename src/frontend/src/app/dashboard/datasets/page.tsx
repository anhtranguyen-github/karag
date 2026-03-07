"use client";

import React, { useState, useEffect } from "react";
import {
    Database,
    Plus,
    Search,
    MoreVertical,
    Trash2,
    ExternalLink,
    RefreshCw,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { datasets as datasetsApi } from "@/sdk/datasets";
import { useParams } from "next/navigation";
import { useToast } from "@/context/toast-context";

export default function DatasetsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string || "default";
    const [datasets, setDatasets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchDatasets();
    }, [workspaceId]);

    const fetchDatasets = async () => {
        try {
            setLoading(true);
            const response = (await datasetsApi.list()) as any;
            setDatasets(response.data || []);
        } catch (error) {
            console.error("Failed to fetch datasets:", error);
            toast.error("Failed to load datasets");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Manage your knowledge collections and indexing status.</p>
                </div>
                <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                    <Plus size={16} className="mr-2" />
                    Create Dataset
                </Button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                        placeholder="Search datasets..."
                        className="pl-11 h-11 rounded-xl bg-card border-border focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium"
                    />
                </div>
                <Button variant="outline" className="h-11 px-4 rounded-xl border-border bg-card font-bold text-xs">
                    <RefreshCw size={14} className="mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Datasets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-3xl bg-card/50 border border-border animate-pulse" />
                    ))
                ) : datasets.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-secondary/20">
                        <Database size={48} className="text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">No datasets found</h3>
                        <p className="text-sm text-muted-foreground/60 mt-1 mb-6 font-medium">Create your first dataset to start indexing knowledge.</p>
                        <Button variant="outline" className="rounded-xl border-indigo-500/20 text-indigo-400 font-bold px-8">
                            New Dataset
                        </Button>
                    </div>
                ) : (
                    datasets.map((dataset) => (
                        <Card key={dataset.id} className="bg-card/50 border-border hover:border-indigo-500/40 transition-all duration-300 group overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                            <Database size={20} />
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                                            <MoreVertical size={16} />
                                        </Button>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight group-hover:text-indigo-400 transition-colors">{dataset.name}</h3>
                                        <p className="text-xs text-muted-foreground font-medium line-clamp-1 mt-1">{dataset.description || "Collection of vectorized knowledge."}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-2">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Status</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Ready</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Engine</p>
                                            <p className="text-[10px] font-bold text-indigo-400 truncate">{dataset.pipeline_id || "default"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-secondary/30 flex items-center justify-between border-t border-border mt-auto">
                                    <div className="flex items-center gap-2">
                                        <FileText size={12} className="text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground">0 documents</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-indigo-400 font-bold text-[10px] gap-1 hover:bg-indigo-500/10">
                                        OPEN
                                        <ExternalLink size={10} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
