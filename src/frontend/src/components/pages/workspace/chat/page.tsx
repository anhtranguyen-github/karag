"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  MessageSquare,
  FileText,
  ChevronDown,
  Sparkles,
  Search,
  Zap
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { generateWorkspaceUrl } from "@/lib/navigation";
import type { ChatMessageSummary } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

type ViewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ document_title?: string }>;
  trace?: string[];
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
  timestamp: Date;
};

function toViewMessage(message: ChatMessageSummary): ViewMessage {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    sources: message.metadata?.sources,
    trace: message.metadata?.trace,
    error: message.metadata?.error,
    timestamp: new Date(message.created_at)
  };
}

function ArrowRight({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function WorkspaceChatPage() {
  const { tenant, isReady, hasPermission, isPermissionsReady } = useTenant();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const sessionId = searchParams.get("session");
  const queryClient = useQueryClient();
  const canCreateSession = hasPermission("chat.session");
  const canAskChat = hasPermission("chat.ask");
  const canSendMessage = canAskChat && (Boolean(sessionId) || canCreateSession);

  const [inputValue, setInputValue] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionMessagesQuery = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => platformApi.listChatMessages({ ...tenant, workspaceId }, sessionId!),
    enabled: isReady && !!workspaceId && !!sessionId
  });

  const createSessionMutation = useMutation({
    mutationFn: (title: string) =>
      platformApi.createChatSession({ ...tenant, workspaceId }, { title }),
    onSuccess: (session) => {
      router.replace(`/dashboard/workspace/${workspaceId}/chat?session=${session.id}`);
    }
  });

  const askMutation = useMutation({
    mutationFn: ({ currentSessionId, query }: { currentSessionId: string; query: string }) =>
      platformApi.askChatSession({ ...tenant, workspaceId }, currentSessionId, query),
    onSuccess: () => {
      setPendingUserMessage(null);
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["chat-sessions", workspaceId] });
      }
    },
    onError: () => {
      setPendingUserMessage(null);
    }
  });

  useEffect(() => {
    if (sessionId && pendingUserMessage && !askMutation.isPending) {
      askMutation.mutate({ currentSessionId: sessionId, query: pendingUserMessage });
    }
  }, [askMutation, pendingUserMessage, sessionId]);

  const messages = useMemo<ViewMessage[]>(
    () => sessionMessagesQuery.data?.map(toViewMessage) ?? [],
    [sessionMessagesQuery.data]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, askMutation.isPending, pendingUserMessage]);

  const optimisticMessages = [...messages];
  if (askMutation.isPending && pendingUserMessage) {
    optimisticMessages.push({
      id: "pending-user",
      role: "user",
      content: pendingUserMessage,
      timestamp: new Date()
    });
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || askMutation.isPending || createSessionMutation.isPending || !canSendMessage) return;

    const query = inputValue.trim();
    setInputValue("");
    setPendingUserMessage(query);

    if (!sessionId) {
      createSessionMutation.mutate(query.slice(0, 80));
      return;
    }

    askMutation.mutate({ currentSessionId: sessionId, query });
  };

  const clearChat = () => {
    setPendingUserMessage(null);
    setInputValue("");
    router.replace(`/dashboard/workspace/${workspaceId}/chat`);
  };

  return (
    <WorkspaceGuard>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background relative w-full">
        {/* Header (Optional inside chat) */}
        <div className="relative z-10 flex items-center justify-between border-b border-border bg-card px-8 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted text-primary">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="leading-tight text-lg font-bold text-foreground font-display">AI Agent</h2>
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {sessionId ? "Saved Thread" : "New Thread"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
              title="Clear conversation"
            >
              <Trash2 size={20} />
            </button>
            <div className="mx-2 h-4 w-[1px] bg-border" />
            <button
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border/50 hover:text-foreground"
              onClick={() => router.push(generateWorkspaceUrl(workspaceId, "history"))}
              type="button"
            >
              Session <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Chat Interaction Area */}
        <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-8 scroll-smooth relative">
          <div className="max-w-3xl mx-auto space-y-12 pb-32">
            
            {optimisticMessages.length === 0 ? (
               <div className="flex flex-col items-center justify-center space-y-6 pt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-xl shadow-primary/10">
                   <Sparkles size={40} className="animate-pulse" />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-2xl font-bold text-foreground font-display">How can I help you today?</h3>
                   <p className="text-lg text-muted-foreground">
                     {canCreateSession
                       ? "Messages are saved to thread history. Trace steps and sources appear on assistant replies."
                       : "You can only ask inside an existing session. Creating new threads requires chat session access."}
                   </p>
                 </div>
                 <div className="grid w-full grid-cols-2 gap-3 mt-8">
                   {["Summarize recent logs", "Check RAG strategy", "List active documents", "Model availability"].map((suggestion) => (
                     <button
                       key={suggestion}
                       onClick={() => setInputValue(suggestion)}
                       className="group rounded-xl border border-border bg-card p-4 text-left text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-muted hover:text-primary"
                     >
                       <div className="flex items-center justify-between">
                         {suggestion}
                         <ArrowRight
                           size={14}
                           className="-translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                         />
                       </div>
                     </button>
                   ))}
                 </div>
               </div>
            ) : (
                <>
                {optimisticMessages.map((msg, idx) => (
                   msg.role === "user" ? (
                      <div key={msg.id || idx} className="flex flex-col items-end gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-3 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">You</span>
                          </div>
                          <div className="max-w-[85%] bg-muted/50 p-4 rounded-xl text-foreground border-r-2 border-primary shadow-sm">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                      </div>
                   ) : (
                      <div key={msg.id || idx} className="flex flex-col items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-sm bg-primary/20 flex items-center justify-center text-primary">
                                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                              </div>
                              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Intelligence</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="w-full space-y-6">
                              {/* Reasoning Trace */}
                              {msg.trace && msg.trace.length > 0 && (
                                  <div className="bg-popover/40 rounded-lg p-4 border border-border">
                                      <button className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
                                          <span className="material-symbols-outlined text-[16px] group-hover:text-primary transition-colors">query_stats</span>
                                          Reasoning Trace ({msg.trace.length} steps)
                                      </button>
                                      <div className="mt-4 flex flex-col gap-3 pl-2 border-l border-border">
                                          {msg.trace.map((step, traceIndex) => (
                                              <div key={`${msg.id}-trace-${traceIndex}`} className="flex items-start gap-3 text-xs text-muted-foreground">
                                                  <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-border" />
                                                  <span className="text-foreground/80 leading-relaxed italic">{step}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Main Response Text */}
                              <div className="text-foreground space-y-4 text-[15px] leading-relaxed font-body whitespace-pre-wrap">
                                  {msg.content}
                              </div>

                              {/* Source Citations */}
                              {msg.sources && msg.sources.length > 0 && (
                                  <div className="pt-6 border-t border-border/50">
                                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Source Citations</h4>
                                      <div className="flex flex-wrap gap-2">
                                          {msg.sources.map((source, sourceIndex) => (
                                              <div key={`${msg.id}-source-${sourceIndex}`} className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer group">
                                                  <span className="material-symbols-outlined text-xs text-primary">article</span>
                                                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary truncate max-w-[200px]">
                                                      {source.document_title || "Document Source"}
                                                  </span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Error messages */}
                              {msg.error && (
                                  <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                      {msg.error.message}
                                  </div>
                              )}
                          </div>
                      </div>
                   )
                ))}

                {(askMutation.isPending || createSessionMutation.isPending) && (
                   <div className="flex flex-col items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-sm bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                              <span className="material-symbols-outlined text-[14px]">bolt</span>
                          </div>
                          <span className="text-[10px] font-bold text-primary tracking-widest uppercase animate-pulse">Thinking</span>
                      </div>
                      <div className="bg-popover/20 rounded-xl p-4 border border-border/50 shadow-sm flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                      </div>
                   </div>
                )}
                </>
            )}

          </div>
        </section>

        {/* Bottom Input Area */}
        <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
          <div className="max-w-3xl mx-auto space-y-4">
             {/* Suggested Prompts Optional */}
             <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-500"></div>
               <div className="relative flex items-center gap-3 bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-2 pr-4 pl-4 shadow-2xl">
                 <button onClick={clearChat} className="p-2 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center" title="New Chat">
                   <span className="material-symbols-outlined">add_circle</span>
                 </button>
                 <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                   <textarea 
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSendMessage(e as any);
                         }
                     }}
                     className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 h-12 max-h-32 resize-none text-foreground placeholder:text-muted-foreground outline-none scrollbar-hide" 
                     placeholder="Ask the workspace anything..." 
                     rows={1}
                     disabled={askMutation.isPending || createSessionMutation.isPending || !canAskChat}
                   />
                   <div className="flex items-center gap-2">
                     <button type="button" className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                       <span className="material-symbols-outlined">attach_file</span>
                     </button>
                     <button 
                       type="submit"
                       disabled={!isPermissionsReady || askMutation.isPending || createSessionMutation.isPending || !inputValue.trim() || !canSendMessage}
                       className="w-10 h-10 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                     >
                       {askMutation.isPending || createSessionMutation.isPending ? (
                         <Loader2 size={18} className="animate-spin" />
                       ) : (
                         <span className="material-symbols-outlined text-[18px]">send</span>
                       )}
                     </button>
                   </div>
                 </form>
               </div>
             </div>
             <div className="flex justify-center">
               <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                 {!canAskChat
                   ? "Chat access required"
                   : !sessionId && !canCreateSession
                     ? "Open an existing thread to continue chatting"
                     : "End-to-end encrypted • Thread history persisted"}
               </p>
             </div>
          </div>
        </footer>

        {/* Visual Texture Layer */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[150px] rounded-full"></div>
        </div>
      </div>
    </WorkspaceGuard>
  );
}
