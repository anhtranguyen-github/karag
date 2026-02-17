"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ThreadList } from "@/components/chat/thread-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { cn } from "@/lib/utils";

export default function ChatPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const threadId = searchParams.get("threadId");

    const handleSelectThread = (id: string) => {
        // Update URL param
        router.push(`${pathname}?threadId=${id}`);
    };

    const activeThreadId = threadId || "new";

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Thread List Sidebar */}
            <ThreadList
                activeThreadId={activeThreadId === "new" ? null : activeThreadId}
                onSelectThread={handleSelectThread}
            />

            {/* Main Chat Area */}
            <div className="flex-1 h-full relative">
                {/* Key ensures ChatInterface remounts when thread changes, clearing state */}
                <ChatInterface key={activeThreadId} threadId={activeThreadId === "new" ? undefined : activeThreadId} />
            </div>
        </div>
    );
}
