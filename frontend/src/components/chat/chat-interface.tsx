"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { Send, Loader2, Brain } from "lucide-react";
import { CitationModal } from "./citation-modal";
import { ChatMessage } from "@/components/chat-message";
import { Message } from "@/context/chat-context";

export function ChatInterface({
    threadId: propThreadId,
    workspaceId: propWorkspaceId
}: {
    threadId?: string;
    workspaceId?: string;
}) {
    const router = useRouter();
    const [workspaceId, setWorkspaceId] = useState<string | undefined>(propWorkspaceId);


    // If no prop threadID, we might be in a "new chat" state or need to redirect
    // For now assume threadId is passed or we generate a new one on first message
    const [threadId, setThreadId] = useState<string | undefined>(propThreadId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [executionMode, setExecutionMode] = useState<"fast" | "thinking" | "deep" | "blending">("thinking");
    const [selectedCitation, setSelectedCitation] = useState<Message["sources"] extends (infer U)[] | undefined ? U : never | null>(null);
    const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch history and metadata if threadId exists
    useEffect(() => {
        const fetchThreadData = async () => {
            if (!threadId || threadId === "new") {
                setMessages([]);
                return;
            }
            try {
                // Fetch History
                const histRes = await api.getChatHistoryChatHistoryThreadIdGet({ threadId });
                const history = ((histRes.data as any) || []).map((msg: any, idx: number) => ({
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
                        execution_mode: executionMode,
                        max_loops: executionMode === "deep" ? 5 : 3,
                        enable_tracing: true
                    }
                }),
                onmessage(msg) {
                    try {
                        const data = JSON.parse(msg.data);

                        setMessages((prev) => {
                            const newMsgs = [...prev];
                            const lastMsg = newMsgs[newMsgs.length - 1];

                            if (lastMsg.id !== assistantMsgId) return prev;

                            if (data.type === "content") {
                                // Append delta
                                lastMsg.content += data.delta || "";
                            } else if (data.type === "thought") {
                                if (!lastMsg.reasoning_steps) lastMsg.reasoning_steps = [];
                                lastMsg.reasoning_steps.push(data.step);
                            } else if (data.type === "reasoning") {
                                if (!lastMsg.reasoning_steps) lastMsg.reasoning_steps = [];
                                if (Array.isArray(data.steps)) {
                                    lastMsg.reasoning_steps = [...lastMsg.reasoning_steps, ...data.steps];
                                } else {
                                    lastMsg.reasoning_steps.push(data.steps);
                                }
                            } else if (data.type === "sources") {
                                lastMsg.sources = data.sources;
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
                            onClick={() => setExecutionMode(mode as any)}
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
