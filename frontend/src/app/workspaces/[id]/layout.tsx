"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { FileText, MessageSquare, Settings, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

    return (
        <div className="h-screen bg-background text-foreground flex flex-col">
            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col">
                <header className="h-16 border-b border-border flex items-center px-8 justify-between shrink-0 bg-background/60 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all mr-2">
                            <ChevronLeft size={14} />
                        </Link>
                        <div className="flex items-center gap-3 pr-4 border-r border-border">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-sm font-bold text-foreground leading-none uppercase tracking-widest">{workspace?.name || "Loading..."}</span>
                        </div>
                        <nav className="flex items-center gap-1 ml-2">
                            <Link href={`/workspaces/${workspaceId}/documents`}>
                                <button className={cn(
                                    "h-9 px-4 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase flex items-center gap-2",
                                    pathname.includes('/documents') ? "text-indigo-400 bg-indigo-500/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                )}>
                                    <FileText size={14} />
                                    DOCS
                                </button>
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href={`/chats/new?workspaceId=${workspaceId}`}>
                            <button className="h-9 px-4 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[10px] tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 uppercase">
                                <MessageSquare size={14} />
                                Chat
                            </button>
                        </Link>
                        <Link href={`/workspaces/${workspaceId}/settings`}>
                            <button className={cn(
                                "h-9 px-4 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase flex items-center gap-2",
                                pathname.includes('/settings') ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20" : "text-muted-foreground bg-secondary hover:bg-muted border border-border"
                            )}>
                                <Settings size={14} />
                                SETTINGS
                            </button>
                        </Link>
                    </div>
                </header>
                <div className="flex-1 overflow-hidden bg-background">
                    {children}
                </div>
            </main>
        </div>
    );
}
