import { useState, useCallback, useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { chat } from '@/sdk/chat';
import { useError } from '@/context/error-context';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning_steps?: string[];
    sources?: Array<{ id: number, name: string, content: string }>;
}

export function useChat(workspaceId: string = "vault") {
    const [messages, setMessages] = useState<Message[]>([]);
    const [threadId, setThreadId] = useState<string>('default');

    // Clear messages when workspaceId changes
    useEffect(() => {
        setMessages([]);
    }, [workspaceId]);

    // Initialize or sync threadId from localStorage when workspaceId changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageKey = `chat_thread_id_${workspaceId}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setThreadId(saved);
            } else {
                const newId = Math.random().toString(36).substring(7);
                localStorage.setItem(storageKey, newId);
                setThreadId(newId);
            }
        }
    }, [workspaceId]);
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();

    const fetchHistory = useCallback(async (id: string) => {
        try {
            const payload = (await chat.getHistory({
                workspaceId: workspaceId,
                threadId: id
            })) as any;

            if (payload.success && payload.data) {
                setMessages(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
            const errorMessage = err instanceof Error ? err.message : "Failed to connect to chat history service.";
            showError("Network Error", errorMessage);
        }
    }, [workspaceId, showError]);

    useEffect(() => {
        if (threadId) {
            fetchHistory(threadId);
        }
    }, [threadId, fetchHistory]);

    const clearChat = useCallback(() => {
        setMessages([]);
        const newId = Math.random().toString(36).substring(7);
        setThreadId(newId);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`chat_thread_id_${workspaceId}`, newId);
        }
    }, [workspaceId]);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        const assistantMessageId = (Date.now() + 1).toString();
        let accumulatedContent = '';

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const streamUrl = `${baseUrl}/workspaces/${workspaceId}/chat/stream`;
            const token = localStorage.getItem("karag_token");

            await fetchEventSource(streamUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: content,
                    thread_id: threadId,
                }),
                onmessage(msg) {
                    if (msg.event === 'FatalError') throw new Error(msg.data);

                    const data = JSON.parse(msg.data);
                    console.log("[SSE Event]", data.type, data);

                    if (data.type === 'content') {
                        accumulatedContent += data.delta;
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: accumulatedContent,
                                    reasoning_steps: lastMsg?.reasoning_steps,
                                    sources: lastMsg?.sources,
                                },
                            ];
                        });
                    } else if (data.type === 'reasoning') {
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: lastMsg?.content || '',
                                    reasoning_steps: data.steps,
                                    sources: lastMsg?.sources,
                                },
                            ];
                        });
                    }
                    else if (data.type === 'sources') {
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: lastMsg?.content || '',
                                    reasoning_steps: lastMsg?.reasoning_steps,
                                    sources: data.sources,
                                },
                            ];
                        });
                    } else if (data.type === 'error') {
                        setIsLoading(false);
                        showError("Execution Error", data.message || "An unexpected error occurred while processing the request.");
                    }
                },
                onclose() {
                    setIsLoading(false);
                },
                onerror(err) {
                    console.error('SSE Error:', err);
                    setIsLoading(false);
                    showError("Sync Stream Interrupted", "The connection to the AI service was lost. Please try again.", "SSE Fatal Connection Error");
                    throw err;
                },
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsLoading(false);
            const errorMessage = error instanceof Error ? error.message : "Failed to initialize communication with the architect.";
            showError("Dispatch Error", errorMessage);
        }
    }, [threadId, workspaceId, showError]);

    return { messages, isLoading, sendMessage, clearChat, threadId, setThreadId };
}
