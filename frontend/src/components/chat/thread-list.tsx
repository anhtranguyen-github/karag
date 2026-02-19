"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";

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
    workspaceId: propWorkspaceId
}: {
    activeThreadId?: string | null,
    onSelectThread: (threadId: string) => void,
    workspaceId?: string
}) {
    const params = useParams();
    const searchParams = useSearchParams();
    const workspaceId = propWorkspaceId || (params.id !== "new" ? params.id as string : null) || searchParams.get("workspaceId");
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchThreads = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.listChatThreadsChatThreadsGet({ workspaceId: workspaceId as string });
            setThreads(res.data || []);
        } catch (e) {
            console.error("Failed to fetch threads", e);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (workspaceId) {
            fetchThreads();
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
            <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground leading-none">History</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCreateThread} title="New Chat" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all active:scale-90">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scanning Threads...</span>
                    </div>
                ) : threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                            <MessageSquare size={16} className="text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empty Cache</span>
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
                            <span className="truncate flex-1 text-xs font-bold tracking-tight">{thread.title || "Untitled Fragment"}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
