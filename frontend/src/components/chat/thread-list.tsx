"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { api } from "@/lib/api-client";

export function ThreadList({
    activeThreadId,
    onSelectThread
}: {
    activeThreadId?: string | null,
    onSelectThread: (threadId: string) => void
}) {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (workspaceId) {
            fetchThreads();
        }
    }, [workspaceId]);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const res = await api.listChatThreadsChatThreadsGet({ workspaceId });
            setThreads(res.data || []);
        } catch (e) {
            console.error("Failed to fetch threads", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateThread = () => {
        // Deselect current thread to trigger "new thread" state in ChatInterface
        onSelectThread("");
        // Alternatively, we could generate a UUID here, but let the interface handle it
    };

    return (
        <div className="w-64 border-r flex flex-col bg-muted/5 h-full">
            <div className="p-4 border-b flex items-center justify-between">
                <span className="font-medium text-sm">Threads</span>
                <Button variant="ghost" size="icon" onClick={handleCreateThread} title="New Chat">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="text-center text-xs text-muted-foreground py-4">Loading threads...</div>
                ) : threads.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-4">No threads yet</div>
                ) : (
                    threads.map((thread) => (
                        <button
                            key={thread.id}
                            onClick={() => onSelectThread(thread.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center gap-2 group",
                                activeThreadId === thread.id
                                    ? "bg-background shadow-sm text-primary ring-1 ring-border"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <MessageSquare className={cn(
                                "w-3.5 h-3.5 transition-transform group-hover:scale-110",
                                activeThreadId === thread.id ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className="truncate flex-1">{thread.title || "New Chat"}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
