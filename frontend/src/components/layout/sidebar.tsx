"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Database,
    GitBranch,
    Search,
    Cpu,
    Plug,
    FileText,
    Key,
    Activity,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active?: boolean;
    collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) => {
    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                active
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
            )}>
                <Icon size={18} className={cn("shrink-0", active ? "text-indigo-400" : "group-hover:text-foreground")} />
                {!collapsed && (
                    <span className="text-sm font-medium tracking-tight truncate">{label}</span>
                )}
                {active && (
                    <motion.div
                        layoutId="active-indicator"
                        className="absolute left-[-12px] w-1 h-6 bg-indigo-500 rounded-r-full"
                    />
                )}
            </div>
        </Link>
    );
};

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
    const pathname = usePathname();

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard/overview" },
        { icon: Database, label: "Datasets", href: "/dashboard/datasets" },
        { icon: GitBranch, label: "Pipelines", href: "/dashboard/pipelines" },
        { icon: Search, label: "Search", href: "/dashboard/search" },
        { icon: FileText, label: "Vault", href: "/dashboard/vault" },
    ];

    const infraItems = [
        { icon: Cpu, label: "Models", href: "/dashboard/models" },
        { icon: Plug, label: "Connectors", href: "/dashboard/connectors" },
        { icon: Key, label: "API Keys", href: "/dashboard/keys" },
        { icon: Activity, label: "Logs", href: "/dashboard/logs" },
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    return (
        <aside className={cn(
            "flex flex-col h-full bg-card border-r border-border transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            {/* Brand */}
            <div className="p-6 flex items-center justify-between">
                {!collapsed && (
                    <Link href="/dashboard/overview" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                            <Zap size={18} className="text-white fill-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tighter text-foreground group-hover:text-indigo-400 transition-colors">KARAG</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-8">
                <div>
                    {!collapsed && <p className="px-3 mb-4 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Main</p>}
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.href}
                                {...item}
                                active={pathname.startsWith(item.href)}
                                collapsed={collapsed}
                            />
                        ))}
                    </nav>
                </div>

                <div>
                    {!collapsed && <p className="px-3 mb-4 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Infrastructure</p>}
                    <nav className="space-y-1">
                        {infraItems.map((item) => (
                            <SidebarItem
                                key={item.href}
                                {...item}
                                active={pathname.startsWith(item.href)}
                                collapsed={collapsed}
                            />
                        ))}
                    </nav>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-border">
                        JD
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold truncate">John Doe</span>
                            <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
