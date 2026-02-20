"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { Send, Loader2, Brain } from "lucide-react";
import { CitationModal } from "./citation-modal";
import { ChatMessage } from "@/components/chat-message";
import { Message } from "@/context/chat-context";

// Singleton cache to persist messages across Page re-mounts (common in Next.js route changes)
const persistenceCache: Record<string, Message[]> = {};
const persistenceMeta: Record<string, any> = {};

export function ChatInterface({
    threadId: propThreadId,
    workspaceId: propWorkspaceId
}: {
    threadId?: string;
    workspaceId?: string;
}) {
    const router = useRouter();
    const [workspaceId, setWorkspaceId] = useState<string | undefined>(propWorkspaceId);

    useEffect(() => {
        return () => { };
    }, []);

    // If no prop threadID, we might be in a "new chat" state or need to redirect
    // For now assume threadId is passed or we generate a new one on first message
    const [threadId, setThreadId] = useState<string | undefined>(propThreadId);

    // Initialize messages from cache if available (restores state after redirect)
    const [messages, setMessages] = useState<Message[]>(() => {
        if (propThreadId && persistenceCache[propThreadId]) {
            return persistenceCache[propThreadId];
        }
        return [];
    });

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(() => {
        if (propThreadId && persistenceMeta[propThreadId]?.isLoading) {
            return true;
        }
        return false;
    });

    const [executionMode, setExecutionMode] = useState<"fast" | "thinking" | "deep" | "blending">("thinking");
    const [selectedCitation, setSelectedCitation] = useState<NonNullable<Message["sources"]>[number] | null>(null);
    const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isRedirecting = useRef(false);

    // Persist messages to cache whenever they change
    useEffect(() => {
        if (threadId) {
            persistenceCache[threadId] = messages;
            persistenceMeta[threadId] = { isLoading };
        }
    }, [messages, threadId, isLoading]);

    // Fetch history and metadata if threadId exists
    useEffect(() => {
        const fetchThreadData = async () => {
            if (!threadId || threadId === "new") {
                // Only clear messages if we are explicitly on a "new" route
                // and NOT currently in the middle of a redirect from a sent message
                if (!isRedirecting.current) {
                    setMessages([]);
                }
                return;
            }

            // Prevent fetching empty history if we just started this thread.
            // We use a counter or check messages to be sure we don't wipe local state.
            if (isRedirecting.current) {
                // We keep isRedirecting.current = true for a bit longer or check messages
                if (messages.length > 0) {
                    isRedirecting.current = false; // We can reset it now
                    return;
                }
                return;
            }
            try {
                // Fetch History
                const histRes = await api.getChatHistoryChatHistoryThreadIdGet({ threadId });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const history = ((histRes.data as any) || []).map((msg: Record<string, string>, idx: number) => ({
                    id: msg.id || `hist-${idx}`,
                    role: msg.role,
                    content: msg.content,
                    sources: msg.sources,
                    reasoning_steps: msg.reasoning_steps
                }));
                setMessages(history);

                // Fetch Metadata to get workspaceId if not provided
                if (!workspaceId) {
                    const metaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat/threads/${threadId}`);
                    if (metaRes.ok) {
                        const payload = await metaRes.json();
                        if (payload.success && payload.data) {
                            setWorkspaceId(payload.data.workspace_id);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch thread data", e);
            }
        };

        fetchThreadData();
    }, [threadId, workspaceId]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // If no threadId, generate one and redirect
        let currentThreadId = threadId;
        if (!currentThreadId || currentThreadId === "new") {
            currentThreadId = crypto.randomUUID();
            isRedirecting.current = true;
            setThreadId(currentThreadId);
            router.push(`/chats/${currentThreadId}`);
        }

        const assistantMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            { id: assistantMsgId, role: "assistant", content: "" },
        ]);

        try {
            await fetchEventSource(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMsg.content,
                    thread_id: currentThreadId,
                    workspace_id: workspaceId || "default",
                    execution: {
                        mode: executionMode,
                        [executionMode]: {
                            max_loops: executionMode === "deep" ? 5 : 3,
                        },
                        tracing: {
                            tracing_enabled: true
                        }
                    }
                }),
                onmessage(msg) {
                    try {
                        const data = JSON.parse(msg.data);
                        setMessages((prev) => {
                            const newMsgs = [...prev];
                            const assistantIdx = newMsgs.findIndex(m => m.id === assistantMsgId);

                            if (data.type === "content") {
                                if (assistantIdx !== -1) {
                                    newMsgs[assistantIdx].content += data.delta;
                                } else {
                                    newMsgs.push({ id: assistantMsgId, role: "assistant", content: data.delta });
                                }
                            } else if (data.type === "reasoning" || data.type === "thought") {
                                if (assistantIdx === -1) {
                                    newMsgs.push({
                                        id: assistantMsgId,
                                        role: "assistant",
                                        content: "",
                                        reasoning_steps: Array.isArray(data.steps) ? data.steps : [data.steps || data.step || data.delta]
                                    });
                                } else {
                                    if (!newMsgs[assistantIdx].reasoning_steps) newMsgs[assistantIdx].reasoning_steps = [];
                                    if (Array.isArray(data.steps)) {
                                        newMsgs[assistantIdx].reasoning_steps = [...newMsgs[assistantIdx].reasoning_steps, ...data.steps];
                                    } else {
                                        newMsgs[assistantIdx].reasoning_steps.push(data.steps || data.step || data.delta);
                                    }
                                }
                            } else if (data.type === "sources") {
                                if (assistantIdx !== -1) newMsgs[assistantIdx].sources = data.sources;
                            }

                            return newMsgs;
                        });
                    } catch (e) {
                        console.error("Error parsing SSE", e);
                    }
                },
                onerror(err) {
                    console.error("SSE Error", err);
                    setIsLoading(false);
                },
                onclose() {
                    setIsLoading(false);
                }
            });
        } catch (e) {
            console.error("Stream failed", e);
            setIsLoading(false);
        }
    };

    const handleCitationClick = (id: number) => {
        // Find the source in the messages
        for (const msg of messages) {
            const source = msg.sources?.find(s => s.id === id);
            if (source) {
                setSelectedCitation(source);
                setIsCitationModalOpen(true);
                return;
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {/* Empty State */}
                {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-secondary border border-border flex items-center justify-center mb-8 relative group">
                            <div className="absolute inset-0 rounded-[2.5rem] bg-indigo-500/20 blur-2xl group-hover:bg-indigo-500/30 transition-all duration-700" />
                            <Brain size={40} className="text-indigo-400 group-hover:scale-110 relative transition-transform duration-700" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">Ask anything about your documents</h2>
                        <p className="text-sm text-muted-foreground max-w-sm text-center font-medium leading-relaxed">
                            I can help you analyze, summarize, or extract key insights from your knowledge base.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <ChatMessage
                        key={msg.id}
                        message={msg}
                        isLoading={isLoading && msg.id === messages[messages.length - 1]?.id}
                        onCitationClick={handleCitationClick}
                    />
                ))}
                {isLoading && (messages[messages.length - 1]?.role === "user" || !messages[messages.length - 1]?.content) && (
                    <div className="flex justify-start">
                        <div className="bg-secondary text-foreground rounded-2xl px-6 py-4 flex items-center shadow-xl border border-border animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin mr-3 text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Searching and processing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 shrink-0 space-y-4 bg-background/80 backdrop-blur-xl border-t border-border">
                <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2">
                    {["fast", "thinking", "deep", "blending"].map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setExecutionMode(mode as typeof executionMode)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all duration-200 border",
                                executionMode === mode
                                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-500 shadow-lg shadow-indigo-500/5"
                                    : "bg-secondary border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/20"
                            )}
                            disabled={isLoading}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                    <div className="relative flex items-center bg-secondary/50 backdrop-blur-2xl rounded-2xl border border-border p-1.5 transition-all duration-300 focus-within:border-indigo-500/50 focus-within:bg-secondary shadow-2xl">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="border-0 bg-transparent h-12 px-4 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-offset-0"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-xl transition-all duration-300",
                                input.trim()
                                    ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-muted text-muted-foreground border border-border"
                            )}
                            disabled={isLoading || !input.trim()}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Send size={18} />
                            )}
                        </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        AI-generated responses may be inaccurate. Verify important information.
                    </p>
                </form>
            </div>

            <CitationModal
                isOpen={isCitationModalOpen}
                onClose={() => setIsCitationModalOpen(false)}
                source={selectedCitation}
            />
        </div>
    );
}
