"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { MessageSquareText, Search, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/ui/page-shell";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceHistoryPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { tenant, isReady, hasPermission, isPermissionsReady } = useTenant();
  const [search, setSearch] = useState("");
  const canCreateSession = hasPermission("chat.session");

  const sessionsQuery = useQuery({
    queryKey: ["chat-sessions", workspaceId],
    queryFn: () => platformApi.listChatSessions({ ...tenant, workspaceId }),
    enabled: isReady && !!workspaceId,
  });

  const messageQueries = useQueries({
    queries: (sessionsQuery.data ?? []).map((session) => ({
      queryKey: ["chat-messages", session.id],
      queryFn: () => platformApi.listChatMessages({ ...tenant, workspaceId }, session.id),
      enabled: isReady && !!workspaceId,
      staleTime: 15_000,
    })),
  });

  const sessions = useMemo(
    () =>
      (sessionsQuery.data ?? [])
        .map((session, index) => {
          const messages = messageQueries[index]?.data ?? [];
          const lastMessage = messages[messages.length - 1];
          const traceCount =
            [...messages].reverse().find((message) => (message.metadata?.trace?.length ?? 0) > 0)?.metadata?.trace?.length ?? 0;
          return {
            ...session,
            preview: lastMessage?.content ?? "No messages yet",
            count: messages.length,
            traceCount,
          };
        })
        .filter((session) => `${session.title ?? ""} ${session.preview}`.toLowerCase().includes(search.toLowerCase())),
    [messageQueries, search, sessionsQuery.data]
  );

  return (
    <WorkspaceGuard>
      <PageShell
        scopeLabel="Workspace"
        title="Thread History"
        subtitle="Saved chat sessions, message counts, and trace availability in one simple list."
      >
        <div className="app-panel flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search thread history" value={search} />
          </div>
          {canCreateSession ? (
            <Link href={`/dashboard/workspace/${workspaceId}/chat`}>
              <span className="btn-primary">New Chat</span>
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">
              {isPermissionsReady ? "New chat requires chat session access." : "Checking access..."}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <Link href={`/dashboard/workspace/${workspaceId}/chat?session=${session.id}`} key={session.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{session.title || "Untitled thread"}</CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">{session.preview}</p>
                    </div>
                    <MessageSquareText className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <span className="status-pill">{session.count} messages</span>
                  {session.traceCount > 0 ? (
                    <span className="status-pill status-pill--warning">
                      <Zap className="h-3 w-3" />
                      {session.traceCount} trace steps
                    </span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </PageShell>
    </WorkspaceGuard>
  );
}
