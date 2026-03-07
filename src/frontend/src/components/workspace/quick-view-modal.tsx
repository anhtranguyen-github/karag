"use client";

import { Info, Brain, HardDrive, Cpu, Search, MessageSquare, Layers, Zap, Loader2, Sparkles } from "lucide-react";
import { Workspace } from "@/sdk/generated";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import React from "react";

interface QuickViewWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspace: Workspace | null;
}

export function QuickViewWorkspaceModal({
    isOpen,
    onClose,
    workspace
}: QuickViewWorkspaceModalProps) {
    const { settings, isLoading } = useSettings(workspace?.id);

    if (!workspace) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-500 tracking-[0.2em] uppercase">
                            Environment Active
                        </div>
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold tracking-tight text-foreground">{workspace.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-40">[{workspace.id.slice(0, 8)}]</span>
                    </div>
                </div>
            )}
            className="max-w-4xl"
            containerClassName="p-0"
        >
            <div className="flex flex-col max-h-[80vh]">
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

                        {/* Left Column: About & Stats */}
                        <div className="md:col-span-4 space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Info size={14} className="text-indigo-400" />
                                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Environment Info</h5>
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed bg-secondary/30 p-5 rounded-2xl border border-border italic">
                                    "{workspace.description || "No description provided for this node."}"
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Zap size={14} className="text-amber-400" />
                                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Metrics</h5>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="p-4 rounded-xl bg-secondary border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MessageSquare size={16} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Threads</span>
                                        </div>
                                        <span className="text-xs font-black text-blue-400">{workspace.stats?.thread_count || 0}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-secondary border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <HardDrive size={16} className="text-emerald-400" />
                                            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Documents</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">{workspace.stats?.doc_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Detailed Setup */}
                        <div className="md:col-span-8 space-y-8">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-dashed border-border rounded-3xl">
                                    <Loader2 size={32} className="text-indigo-500 animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving configuration...</span>
                                </div>
                            ) : settings ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <Brain size={16} className="text-indigo-400" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Intelligence Stack</h5>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                                <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest block">LLM Gen Model</span>
                                                <div className="text-xs font-bold text-foreground truncate">{settings.llm_model?.split('/').pop() || 'N/A'}</div>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                                <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest block">Vector Embedder</span>
                                                <div className="text-xs font-bold text-foreground truncate">{settings.embedding_model?.split('/').pop() || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <Search size={16} className="text-indigo-400" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Search Protocol</h5>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-secondary/60 border border-border grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Engine Type</span>
                                                <div className="flex items-center gap-2">
                                                    <Layers size={14} className="text-indigo-400" />
                                                    <div className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                                        {settings.rag_engine === 'graph' ? 'Knowledge Graph' : 'Vector Space'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Retrieval Depth</span>
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={14} className="text-amber-400" />
                                                    <div className="text-[10px] font-black text-foreground">{settings.search_limit} Context Chunks</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 text-[10px] font-black tracking-widest transition-all active:scale-95 uppercase"
                    >
                        Close View
                    </button>
                </div>
            </div>
        </Modal>
    );
}
