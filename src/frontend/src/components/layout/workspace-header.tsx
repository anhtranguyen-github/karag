'use client';

import React, { useState } from "react";
import {
    ChevronDown,
    Terminal,
    ShieldCheck,
    User as UserIcon,
    Bell,
    Command,
    Search,
    Check
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { motion, AnimatePresence } from "framer-motion";

export function WorkspaceHeader() {
    const { user } = useAuth();
    const { workspaces, currentWorkspace, selectWorkspace, createWorkspace } = useWorkspaces();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30 sticky top-0">

            {/* Left: Workspace Selector */}
            <div className="flex items-center gap-6">
                <div className="w-48">
                    <WorkspaceSwitcher
                        workspaces={workspaces}
                        currentWorkspace={currentWorkspace || null}
                        onSelect={(ws) => selectWorkspace(ws)}
                        onCreate={async (name) => {
                            try {
                                await createWorkspace({ name });
                                return { success: true };
                            } catch (e) {
                                return { success: false, error: "Failed to create" };
                            }
                        }}
                    />
                </div>

                {/* Global Pipeline Status */}
                <div className="hidden lg:flex items-center gap-4 border-l border-border pl-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Operational</span>
                    </div>
                </div>
            </div>

            {/* Right: Search, Notifications, User */}
            <div className="flex items-center gap-4">

                {/* Command Search Bar */}
                <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-xl bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-all group w-64">
                    <Search size={14} />
                    <span className="text-xs font-medium flex-1">Search or jump to...</span>
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background border border-border text-[9px] font-bold opacity-60 group-hover:opacity-100">
                        <Command size={8} />
                        K
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        <Bell size={18} />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        <Terminal size={18} />
                    </button>
                </div>

                <div className="h-8 w-[1px] bg-border mx-2" />

                <div className="flex items-center gap-3 pl-2">
                    <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-xs font-bold leading-none">{user?.fullName || "User"}</span>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Admin</span>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-white/10 active:scale-95 transition-all cursor-pointer">
                        <UserIcon size={18} />
                    </div>
                </div>
            </div>
        </header>
    );
}
