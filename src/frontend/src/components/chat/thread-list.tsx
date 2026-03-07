"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { chat } from "@/sdk/chat";

interface Thread {
    id: string;
    title: string;
    workspace_id: string;
    created_at: string;
    updated_at: string;
}

export function ThreadList({
    activeThreadId,
    onSelectThread,
    onToggle,
    workspaceId: propWorkspaceId
}: {
    activeThreadId?: string | null,
    onSelectThread: (threadId: string) => void,
    onToggle?: () => void,
    workspaceId?: string
}) {
    const searchParams = useSearchParams();
    const workspaceId = propWorkspaceId || searchParams.get("workspaceId");
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchThreads = React.useCallback(async (isInitial = false) => {
        // Only show the heavy loader if it's the very first time we load any threads
        if (isInitial && threads.length === 0) {
            setLoading(true);
        }
        try {
            const res = (await chat.listThreads({ workspaceId: workspaceId as string })) as any;
            setThreads((res.data as unknown as Thread[]) || []);
        } catch (e) {
            console.error("Failed to fetch threads", e);
        } finally {
            setLoading(false);
        }
    }, [workspaceId, threads.length]);

    useEffect(() => {
        if (workspaceId) {
            // Clear current threads immediately on workspace switch so we don't show stale data
            setThreads([]);
            fetchThreads(true);
            const interval = setInterval(() => fetchThreads(false), 8000);
            return () => clearInterval(interval);
        }
    }, [workspaceId, fetchThreads]);

    const handleCreateThread = () => {
        if (workspaceId) {
            onSelectThread(`new?workspaceId=${workspaceId}`);
        } else {
            onSelectThread("new");
        }
    };

    return (
        <div className="w-full flex flex-col bg-card h-full shrink-0 border-r border-border">
            <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0 bg-background/50">
                <div className="flex items-center gap-4">
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-95 group"
                            title="Close Sidebar"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    )}
                    <span className="text-[11px] font-black tracking-[0.3em] text-foreground/80 leading-none">history</span>
                </div>
                <button
                    onClick={handleCreateThread}
                    title="New Chat"
                    className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {loading && threads.length === 0 ? (
                    <div className="space-y-2 py-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 w-full rounded-xl bg-secondary/50 animate-pulse" />
                        ))}
                    </div>
                ) : threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                            <MessageSquare size={16} className="text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground">no history yet</span>
                    </div>
                ) : (
                    threads.map((thread) => (
                        <button
                            key={thread.id}
                            onClick={() => onSelectThread(thread.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group relative overflow-hidden",
                                activeThreadId === thread.id
                                    ? "bg-secondary text-indigo-500 border border-border shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                            )}
                        >
                            {activeThreadId === thread.id && (
                                <motion.div
                                    layoutId="active-thread"
                                    className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-full"
                                />
                            )}
                            <MessageSquare className={cn(
                                "w-4 h-4 transition-transform group-hover:scale-110",
                                activeThreadId === thread.id ? "text-indigo-500" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span className="truncate flex-1 text-xs font-bold tracking-tight">{thread.title || "New chat"}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
