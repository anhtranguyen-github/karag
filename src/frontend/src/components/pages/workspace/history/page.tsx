"use client";

import { Clock, ExternalLink, MessageSquareText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { WorkspaceGuard } from "@/components/ui/workspace-guard";

const DEMO_HISTORY = [
  {
    id: "s1",
    title: "How to configure vector store",
    messageCount: 12,
    createdAt: "2025-03-18T10:30:00Z",
    lastMessageAt: "2025-03-18T11:02:00Z",
  },
  {
    id: "s2",
    title: "Summarize uploaded PDF",
    messageCount: 5,
    createdAt: "2025-03-17T14:00:00Z",
    lastMessageAt: "2025-03-17T14:15:00Z",
  },
  {
    id: "s3",
    title: "Explain RAG pipeline steps",
    messageCount: 8,
    createdAt: "2025-03-15T09:00:00Z",
    lastMessageAt: "2025-03-15T09:45:00Z",
  },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WorkspaceHistoryPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => DEMO_HISTORY.filter((s) => s.title.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <WorkspaceGuard>
      <div className="mx-auto w-full max-w-5xl py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#e5e5e5]">Chat History</h1>
          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm text-[#9ca3af] transition-colors hover:text-[#e5e5e5]">
              <ExternalLink className="h-3 w-3" />
              Docs
            </button>
            <Link
              className="flex h-8 items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 text-sm font-medium text-[#e5e5e5] hover:bg-orange-600 transition-colors"
              href={`/dashboard/workspace/${workspaceId}/chat`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              New chat
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              className="h-8 w-full rounded-xl border border-[#2a2a2a] bg-[#121212] pl-8 pr-3 text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none focus:border-orange-500"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              value={search}
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((session) => (
            <Link
              className="flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-colors hover:bg-[#1f1f1f]"
              href={`/dashboard/workspace/${workspaceId}/chat?session=${session.id}`}
              key={session.id}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a]">
                <MessageSquareText className="h-4 w-4 text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#e5e5e5]">{session.title}</p>
                <p className="text-xs text-[#6b7280]">{session.messageCount} messages</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#6b7280]">
                <Clock className="h-3 w-3" />
                {timeAgo(session.lastMessageAt)}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center text-sm text-[#6b7280]">
              {search ? "No conversations match your search." : "No chat history yet. Start a conversation!"}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-[#6b7280]">Showing {filtered.length} of {DEMO_HISTORY.length} conversations</p>
      </div>
    </WorkspaceGuard>
  );
}
