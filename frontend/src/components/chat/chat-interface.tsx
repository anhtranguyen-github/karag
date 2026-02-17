"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { Send, User, Bot, Loader2, FileText, Brain } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: any[];
    reasoning_steps?: any[];
    timestamp?: number;
}

export function ChatInterface({ threadId: propThreadId }: { threadId?: string }) {
    const params = useParams();
    const workspaceId = params.id as string;
    const router = useRouter();

    // If no prop threadID, we might be in a "new chat" state or need to redirect
    // For now assume threadId is passed or we generate a new one on first message
    const [threadId, setThreadId] = useState<string | undefined>(propThreadId);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch history if threadId exists
    useEffect(() => {
        const fetchHistory = async () => {
            if (!threadId) return;
            try {
                const res = await api.getChatHistoryChatHistoryThreadIdGet({ threadId });
                // Map response to Message format. 
                // The API returns { data: [ { role, content, ... } ] }
                const history = (res.data as any[]).map((msg: any, idx: number) => ({
                    id: msg.id || `hist-${idx}`,
                    role: msg.role,
                    content: msg.content,
                    sources: msg.sources,
                    reasoning_steps: msg.reasoning_steps
                }));
                setMessages(history);
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
        };

        if (threadId && threadId !== "new") {
            fetchHistory();
        } else {
            setMessages([]);
        }
    }, [threadId]);

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

        // If no threadId, generate one
        let currentThreadId = threadId;
        if (!currentThreadId || currentThreadId === "new") {
            currentThreadId = crypto.randomUUID();
            setThreadId(currentThreadId);
            // Replace URL without full reload if possible, or just push
            window.history.replaceState(null, "", `/workspaces/${workspaceId}/chat?threadId=${currentThreadId}`);
            // Or using query param for now for simplicity, ideally route param /t/id
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
                    workspace_id: workspaceId
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
                                lastMsg.content += data.delta || ""; // sometimes delta can be null?
                            } else if (data.type === "reasoning") {
                                if (!lastMsg.reasoning_steps) lastMsg.reasoning_steps = [];
                                // Assuming steps is an array or object? content says steps: output['reasoning_steps']
                                // which might be a list of strings or objects.
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
                    // Don't throw, let it finish. 
                    // Or maybe throw to trigger onclose? fetchEventSource retries by default?
                },
                onclose() {
                    setIsLoading(false);
                    // Also trigger thread list refresh?
                }
            });
        } catch (e) {
            console.error("Stream failed", e);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Brain className="w-12 h-12 mb-4" />
                        <p>Ask anything about your documents...</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex w-full",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "flex max-w-[80%] rounded-lg px-4 py-2",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                            )}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                                {/* Citations / Sources */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border/20 grid grid-cols-1 gap-1">
                                        <span className="text-xs font-semibold opacity-70">Sources:</span>
                                        {msg.sources.map((source: any, idx: number) => (
                                            <button
                                                key={idx}
                                                className="flex items-center text-xs opacity-70 hover:opacity-100 bg-background/10 p-1 rounded transition-opacity text-left truncate"
                                                onClick={() => {
                                                    // Handle citation click - open preview
                                                    // For now just alert or log
                                                    console.log("View source", source);
                                                }}
                                            >
                                                <FileText className="w-3 h-3 mr-1 flex-shrink-0" />
                                                <span className="truncate">{source.metadata?.name || source.metadata?.source || "Document"}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-lg px-4 py-2 flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
