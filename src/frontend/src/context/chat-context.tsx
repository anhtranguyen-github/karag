'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { chat } from '@/sdk/chat';
import { useError } from '@/context/error-context';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning_steps?: string[];
    sources?: Array<{ id: number, name: string, content: string }>;
}

export interface Thread {
    id: string;
    title?: string | null;
    last_active: string;
    message_count: number;
}

interface ChatContextType {
    messages: Message[];
    threadId: string;
    isLoading: boolean;
    threads: Thread[];
    isLoadingThreads: boolean;
    setThreadId: (id: string) => void;
    sendMessage: (content: string, workspaceId: string) => Promise<void>;
    clearChat: (workspaceId: string) => void;
    fetchThreads: (workspaceId: string) => Promise<void>;
    deleteThread: (id: string, workspaceId: string) => Promise<void>;
    fetchHistory: (id: string, workspaceId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [threadId, setThreadId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);
    const { showError } = useError();

    // Cache messages per thread to avoid re-fetching
    const historyCache = useRef<Record<string, Message[]>>({});

    const fetchHistory = useCallback(async (id: string, workspaceId: string) => {
        if (!id) return;
        if (historyCache.current[id]) {
            setMessages(historyCache.current[id]);
            return;
        }

        try {
            const payload = (await chat.getHistory({
                workspaceId: workspaceId!,
                threadId: id
            })) as any;
            if (payload.success && payload.data) {
                setMessages(payload.data);
                historyCache.current[id] = payload.data;
            }
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
        }
    }, []);

    const fetchThreads = useCallback(async (workspaceId: string) => {
        setIsLoadingThreads(true);
        try {
            const payload = (await chat.listThreads({
                workspaceId: workspaceId!
            })) as any;
            if (payload.success && payload.data) {
                setThreads(payload.data);
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoadingThreads(false);
        }
    }, []);

    const deleteThread = useCallback(async (id: string, workspaceId: string) => {
        try {
            const payload = (await chat.deleteThread({
                workspaceId: workspaceId!,
                threadId: id
            })) as any;
            if (payload.success) {
                setThreads(prev => prev.filter(t => t.id !== id));
                delete historyCache.current[id];
                if (threadId === id) {
                    setMessages([]);
                    setThreadId('');
                }
            }
        } catch (err) {
            console.error('Failed to delete thread', err);
        }
    }, [threadId]);

    const sendMessage = useCallback(async (content: string, workspaceId: string) => {
        if (!threadId) {
            const newId = Math.random().toString(36).substring(7);
            setThreadId(newId);
        }

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
                    thread_id: threadId || assistantMessageId.substring(0, 8), // Fallback if threadId state hasn't updated
                }),
                onmessage(msg) {
                    if (msg.event === 'FatalError') throw new Error(msg.data);
                    const data = JSON.parse(msg.data);

                    if (data.type === 'content') {
                        accumulatedContent += data.delta;
                        setMessages((prev) => {
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const updatedAssistant: Message = {
                                id: assistantMessageId,
                                role: 'assistant',
                                content: accumulatedContent,
                                reasoning_steps: lastMsg?.reasoning_steps,
                                sources: lastMsg?.sources,
                            };
                            return [...otherMessages, updatedAssistant];
                        });
                    } else if (data.type === 'reasoning') {
                        setMessages((prev) => {
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            return [...otherMessages, {
                                ...lastMsg,
                                id: assistantMessageId,
                                role: 'assistant',
                                content: lastMsg?.content || '',
                                reasoning_steps: data.steps
                            } as Message];
                        });
                    } else if (data.type === 'sources') {
                        setMessages((prev) => {
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            return [...otherMessages, {
                                ...lastMsg,
                                id: assistantMessageId,
                                role: 'assistant',
                                content: lastMsg?.content || '',
                                sources: data.sources
                            } as Message];
                        });
                    } else if (data.type === 'error') {
                        setIsLoading(false);
                        showError("Architect Execution Error", data.message || "An unexpected error occurred.");
                        setMessages((prev) => {
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            return [...otherMessages, {
                                ...lastMsg,
                                id: assistantMessageId,
                                role: 'assistant',
                                content: data.message || "Error during processing.",
                            } as Message];
                        });
                    }
                },
                onclose() {
                    setIsLoading(false);
                    // Update cache after stream ends
                    setMessages(prev => {
                        if (threadId) historyCache.current[threadId] = prev;
                        return prev;
                    });
                },
                onerror(err) {
                    setIsLoading(false);
                    showError("Stream Error", "Connection lost.");
                    throw err;
                }
            });
        } catch (_error) {
            setIsLoading(false);
            showError("Dispatch Error", "Failed to reach AI.");
        }
    }, [threadId, showError]);

    const clearChat = useCallback((workspaceId: string) => {
        setMessages([]);
        const newId = Math.random().toString(36).substring(7);
        setThreadId(newId);
        localStorage.setItem(`chat_thread_id_${workspaceId}`, newId);
    }, []);

    return (
        <ChatContext.Provider value={{
            messages, threadId, isLoading, threads, isLoadingThreads,
            setThreadId, sendMessage, clearChat, fetchThreads, deleteThread, fetchHistory
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}
