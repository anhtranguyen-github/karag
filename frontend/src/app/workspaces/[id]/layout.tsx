"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { FileText, MessageSquare, Settings, ChevronLeft, Loader2 } from "lucide-react";

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const params = useParams();
    const workspaceId = params.id as string;
    const { workspaces, isLoading } = useWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    const navItems = [
        {
            href: `/chats/new?workspaceId=${workspaceId}`,
            label: "Chat",
            icon: MessageSquare,
        },
        {
            href: `/workspaces/${workspaceId}/documents`,
            label: "Documents",
            icon: FileText,
        },
        {
            href: `/workspaces/${workspaceId}/settings`,
            label: "Settings",
            icon: Settings,
        },
    ];

    return (
        <div className="h-screen bg-background flex flex-col">
            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col">
                <header className="h-16 border-b border-white/5 flex items-center px-8 justify-between shrink-0 bg-[#0a0a0b]/60 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all mr-2">
                            <ChevronLeft size={14} />
                        </Link>
                        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-sm font-bold text-white leading-none uppercase tracking-widest">{workspace?.name || "Loading..."}</span>
                        </div>
                        <nav className="flex items-center gap-1 ml-2">
                            <Link href={`/workspaces/${workspaceId}/documents`}>
                                <button className={cn(
                                    "h-9 px-4 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase flex items-center gap-2",
                                    pathname.includes('/documents') ? "text-white bg-white/10" : "text-gray-500 hover:text-white hover:bg-white/5"
                                )}>
                                    <FileText size={14} />
                                    DOCS
                                </button>
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href={`/chats/new?workspaceId=${workspaceId}`}>
                            <button className="h-9 px-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all font-bold text-[10px] tracking-widest text-gray-400 hover:text-white flex items-center gap-2 uppercase">
                                <MessageSquare size={14} />
                                Chat
                            </button>
                        </Link>
                        <Link href={`/workspaces/${workspaceId}/settings`}>
                            <button className={cn(
                                "h-9 px-4 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase flex items-center gap-2",
                                pathname.includes('/settings') ? "text-white bg-white/10" : "text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
                            )}>
                                <Settings size={14} />
                                SETTINGS
                            </button>
                        </Link>
                    </div>
                </header>
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
