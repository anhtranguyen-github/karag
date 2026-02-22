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
        const handleForceNew = () => {
            setThreadId(undefined);
            setMessages([]);
            setIsLoading(false);
            lastFetchedThreadId.current = null;
        };
        window.addEventListener("force-new-chat", handleForceNew);
        return () => window.removeEventListener("force-new-chat", handleForceNew);
    }, []);

    // If no prop threadID, we might be in a "new chat" state or need to redirect
    // For now assume threadId is passed or we generate a new one on first message
    const [threadId, setThreadId] = useState<string | undefined>(propThreadId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [executionMode, setExecutionMode] = useState<"auto" | "fast" | "think" | "deep">("auto");
    const [selectedCitation, setSelectedCitation] = useState<NonNullable<Message["sources"]>[number] | null>(null);
    const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastFetchedThreadId = useRef<string | null>(null);
    const isStreaming = useRef(false);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Handle Thread Switching and Persistence Recovery
    useEffect(() => {
        const loadThread = async () => {
            if (!propThreadId || propThreadId === "new") {
                setThreadId(undefined);
                setMessages([]);
                setIsLoading(false);
                lastFetchedThreadId.current = null;
                return;
            }

            // Check if we have a persisted session for this thread ID (usually after a new-chat redirect)
            const sessionData = sessionStorage.getItem(`chat_persist_${propThreadId}`);
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    setMessages(parsed.messages || []);
                    setIsLoading(parsed.isLoading || false);
                    setThreadId(propThreadId);
                    lastFetchedThreadId.current = propThreadId;

                    if (parsed.isLoading && !isStreaming.current) {
                        // Resume streaming if it was interrupted by redirect
                        resumeStreaming(propThreadId, parsed.workspaceId, parsed.mode, parsed.messages);
                    }

                    sessionStorage.removeItem(`chat_persist_${propThreadId}`);
                    return;
                } catch (e) {
                    console.error("Failed to recover session:", e);
                }
            }

            if (propThreadId === lastFetchedThreadId.current) return;

            setThreadId(propThreadId);
            setIsLoading(true);
            setMessages([]); // Clear while loading existing thread

            try {
                const histRes = await api.getChatHistoryChatHistoryThreadIdGet({ threadId: propThreadId });
                const history = (histRes.data as any[] || []).map((msg, idx) => ({
                    id: msg.id || `hist-${idx}-${Date.now()}`,
                    role: msg.role,
                    content: msg.content,
                    sources: msg.sources || [],
                    reasoning_steps: msg.reasoning_steps || []
                }));
                setMessages(history);
                lastFetchedThreadId.current = propThreadId;
            } catch (err) {
                console.error("Failed to load thread history:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadThread();
    }, [propThreadId]);

    const resumeStreaming = async (tid: string, wid: string, mode: string, currentMsgs: Message[]) => {
        const lastUserMsg = [...currentMsgs].reverse().find(m => m.role === "user");
        if (!lastUserMsg) return;

        await startStreaming(lastUserMsg.content, tid, wid, mode, true, currentMsgs);
    };

    const startStreaming = async (messageText: string, tid: string, wid: string, mode: string, isResuming = false, initialMsgs?: Message[]) => {
        if (isStreaming.current) return;
        isStreaming.current = true;
        setIsLoading(true);

        const currentMsgs = initialMsgs || messages;

        // In case of redirect, we want to pick up the last assistant message if it exists
        const assistantMsgId = isResuming
            ? currentMsgs.find(m => m.role === "assistant" && m.id.startsWith("asst-"))?.id || `asst-${Date.now()}`
            : `asst-${Date.now()}`;

        if (!isResuming) {
            // Add assistant placeholder only if not resuming an existing one
            setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "", reasoning_steps: [] }]);
        }

        try {
            await fetchEventSource(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageText,
                    thread_id: tid,
                    workspace_id: wid,
                    execution: {
                        mode: mode,
                        [mode]: {
                            max_loops: mode === "deep" ? 10 : (mode === "think" ? 5 : (mode === "auto" ? 3 : 1))
                        },
                        tracing: { tracing_enabled: true }
                    }
                }),
                onmessage(msg) {
                    if (!msg.data) return;
                    try {
                        const data = JSON.parse(msg.data);
                        setMessages(prev => {
                            const newMsgs = [...prev];
                            const idx = newMsgs.findIndex(m => m.id === assistantMsgId);
                            if (idx === -1) return prev;

                            if (data.type === "content") {
                                newMsgs[idx] = { ...newMsgs[idx], content: newMsgs[idx].content + data.delta };
                            } else if (data.type === "reasoning" || data.type === "thought") {
                                const steps = Array.isArray(data.steps) ? data.steps : [data.step || data.delta];
                                newMsgs[idx] = {
                                    ...newMsgs[idx],
                                    reasoning_steps: [...(newMsgs[idx].reasoning_steps || []), ...steps.filter(Boolean)]
                                };
                            } else if (data.type === "sources") {
                                newMsgs[idx] = { ...newMsgs[idx], sources: data.sources };
                            }
                            return newMsgs;
                        });
                    } catch (e) {
                        console.error("Error parsing stream chunk:", e);
                    }
                },
                onclose() {
                    setIsLoading(false);
                    isStreaming.current = false;
                },
                onerror(err) {
                    console.error("Stream error:", err);
                    setIsLoading(false);
                    isStreaming.current = false;
                    throw err; // Stop retrying
                }
            });
        } catch (err) {
            console.error("Streaming failed:", err);
            setIsLoading(false);
            isStreaming.current = false;
        }
    };

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const messageText = input;
        const currentWorkspaceId = propWorkspaceId || "vault";

        // Set user message immediately
        const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: messageText };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");

        let tid = threadId;
        if (!tid || tid === "new") {
            tid = crypto.randomUUID();
            lastFetchedThreadId.current = tid;
            setThreadId(tid);

            // Use history.pushState to update URL without triggering Next.js route reload
            window.history.pushState(null, '', `/chats/${tid}?workspaceId=${currentWorkspaceId}`);

            // Start streaming immediately!
            await startStreaming(messageText, tid, currentWorkspaceId, executionMode);
            return;
        }

        await startStreaming(messageText, tid, currentWorkspaceId, executionMode);
    };

    const handleCitationClick = (id: number) => {
        const source = messages.flatMap(m => m.sources || []).find(s => s.id === id);
        if (source) {
            setSelectedCitation(source);
            setIsCitationModalOpen(true);
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
                            <span className="text-xs font-bold text-muted-foreground">Searching...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 shrink-0 space-y-4 bg-background/80 backdrop-blur-xl border-t border-border">
                <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2">
                    {["auto", "fast", "think", "deep"].map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setExecutionMode(mode as any)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-full transition-all duration-200 border capitalize",
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
                    <p className="text-[9px] text-muted-foreground/50 font-bold mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        AI responses can be inaccurate. Please verify important info.
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
