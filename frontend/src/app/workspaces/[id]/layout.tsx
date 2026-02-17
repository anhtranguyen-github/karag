"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, MessageSquare, Settings, ChevronLeft } from "lucide-react";

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const params = useParams();
    const workspaceId = params.id as string;

    const navItems = [
        {
            href: `/workspaces/${workspaceId}/chat`,
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
        <div className="flex h-screen bg-background">
            {/* Sidebar Nav */}
            <aside className="w-64 border-r bg-muted/30 flex flex-col h-screen sticky top-0 group/sidebar">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-3 group/logo">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg group-hover/logo:scale-105 transition-transform">
                            K
                        </div>
                        <span className="font-bold text-lg tracking-tight">Karag</span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                    isActive
                                        ? "bg-background text-primary shadow-sm ring-1 ring-border"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4 transition-transform group-hover:scale-110",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Status</h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Connected
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t text-[10px] text-muted-foreground text-center">
                    ID: {workspaceId.slice(0, 8)}...
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
