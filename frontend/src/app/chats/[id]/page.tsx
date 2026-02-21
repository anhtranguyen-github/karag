"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThreadList } from "@/components/chat/thread-list";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { ChatInterface } from "@/components/chat/chat-interface";
import { API_ROUTES } from "@/lib/api-config";
import { Loader2, Home, FileText, Settings, PanelLeftOpen } from "lucide-react";
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
    const isRedirecting = useRef(false);

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

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
                            <span className="text-xs font-bold text-muted-foreground">Loading chat...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar remains stable */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 bg-background border-r border-border transition-all duration-300 overflow-hidden lg:relative",
                    isHistoryOpen ? "translate-x-0 w-80 shadow-2xl lg:shadow-none" : "-translate-x-full w-0"
                )}
            >
                <div className="w-80 h-full">
                    <ThreadList
                        activeThreadId={threadId}
                        workspaceId={workspaceId || ""}
                        onSelectThread={handleSelectThread}
                        onToggle={() => setIsHistoryOpen(false)}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Header */}
                <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        {!isHistoryOpen && (
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-indigo-500 hover:border-indigo-500/30 transition-all group"
                                title="Expand History"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                        )}
                        <Link href="/" className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all group">
                            <Home size={18} className="group-active:scale-90" />
                        </Link>
                        {workspaceId && (
                            <div className="flex items-center gap-3 pl-6 border-l border-border">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                <span className="text-sm font-bold text-foreground">{workspace?.name || "Loading..."}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {workspaceId && (
                            <div className="flex items-center gap-2">
                                <Link href={`/workspaces/${workspaceId}/documents`}>
                                    <button className="h-10 px-5 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[10px] tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
                                        <FileText size={16} />
                                        Documents
                                    </button>
                                </Link>
                                <Link href={`/workspaces/${workspaceId}/settings`}>
                                    <button className="h-10 px-5 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[10px] tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
                                        <Settings size={16} />
                                        Settings
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 relative overflow-hidden">
                    <ChatInterface
                        threadId={threadId === "new" ? undefined : threadId}
                        workspaceId={workspaceId || undefined}
                    />
                </div>
            </div>
        </div>
    );
}
