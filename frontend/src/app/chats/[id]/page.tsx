"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThreadList } from "@/components/chat/thread-list";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { ChatInterface } from "@/components/chat/chat-interface";
import { API_ROUTES } from "@/lib/api-config";
import { Loader2, Home, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

export default function GlobalChatPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const threadId = params.id as string;
    const [workspaceId, setWorkspaceId] = useState<string | null>(searchParams.get("workspaceId"));
    const [isLoading, setIsLoading] = useState(true);
    const { workspaces } = useWorkspaces();
    const workspace = workspaceId ? workspaces.find(w => w.id === workspaceId) : null;
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);

    useEffect(() => {
        const fetchThreadMeta = async () => {
            if (!threadId || threadId === "new") {
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetch(API_ROUTES.THREAD_GET(threadId));
                if (res.ok) {
                    const payload = await res.json();
                    if (payload.success && payload.data) {
                        setWorkspaceId(payload.data.workspace_id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch thread metadata", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThreadMeta();
    }, [threadId]);

    const handleSelectThread = (id: string) => {
        router.push(`/chats/${id}`);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
            {/* Thread List Sidebar */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 256, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="h-full overflow-hidden border-r border-border bg-card"
                    >
                        <ThreadList
                            activeThreadId={threadId === "new" ? null : threadId}
                            onSelectThread={handleSelectThread}
                            key={workspaceId || 'global'}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Workspace Header */}
                <header className="h-16 border-b border-border flex items-center px-6 justify-between shrink-0 bg-background/60 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all mr-2"
                            title={isHistoryOpen ? "Close History" : "Open History"}
                        >
                            <div className="flex flex-col gap-0.5 pointer-events-none">
                                <div className={cn("w-3 h-0.5 bg-current transition-all", isHistoryOpen ? "rotate-45 translate-y-1" : "")} />
                                <div className={cn("w-3 h-0.5 bg-current transition-all", isHistoryOpen ? "opacity-0" : "")} />
                                <div className={cn("w-3 h-0.5 bg-current transition-all", isHistoryOpen ? "-rotate-45 -translate-y-1" : "")} />
                            </div>
                        </button>
                        <Link href="/" className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all group">
                            <Home size={14} className="group-active:scale-90" />
                        </Link>
                        {workspaceId && (
                            <div className="flex items-center gap-3 pl-4 border-l border-border">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-sm font-bold text-foreground leading-none">{workspace?.name || "Loading..."}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {workspaceId && (
                            <div className="flex items-center gap-2">
                                <Link href={`/workspaces/${workspaceId}/documents`}>
                                    <button className="h-9 px-4 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[10px] tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 uppercase">
                                        <FileText size={14} />
                                        Documents
                                    </button>
                                </Link>
                                <Link href={`/workspaces/${workspaceId}/settings`}>
                                    <button className="h-9 px-4 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[10px] tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 uppercase">
                                        <Settings size={14} />
                                        Settings
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 relative overflow-hidden bg-background">
                    <ChatInterface
                        key={threadId}
                        threadId={threadId === "new" ? undefined : threadId}
                        workspaceId={workspaceId || undefined}
                    />
                </div>
            </div>
        </div>
    );
}
