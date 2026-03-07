"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { WorkspaceHeader } from "./workspace-header";
import { useAuth } from "@/context/auth-context";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar - Persistent Navigation */}
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Dynamic Header */}
                <WorkspaceHeader />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b]/50 relative">
                    {/* Subtle noise/grid background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/grid.svg')] bg-[size:40px_40px]" />

                    <div className="relative z-10 p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
