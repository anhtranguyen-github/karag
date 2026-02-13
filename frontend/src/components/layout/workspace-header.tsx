'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspaceContext } from '@/context/workspace-context';
import { cn } from '@/lib/utils';
import {
    Home, MessageSquare, FileText, Settings,
    ChevronDown, Database, Zap, ShieldCheck
} from 'lucide-react';

interface WorkspaceHeaderProps {
    onWorkspaceClick?: () => void;
}

export function WorkspaceHeader({ onWorkspaceClick }: WorkspaceHeaderProps) {
    const { currentWorkspace, workspaceId, isDefault, ragEngine, documentCount } = useWorkspaceContext();
    const pathname = usePathname();

    const navItems = [
        { href: `/workspaces/${workspaceId}`, label: 'Overview', icon: Home },
        { href: `/workspaces/${workspaceId}/chat`, label: 'Chat', icon: MessageSquare },
        { href: `/workspaces/${workspaceId}/documents`, label: 'Documents', icon: FileText },
        { href: `/workspaces/${workspaceId}/kernel`, label: 'Settings', icon: Settings },
    ];


    const isActive = (href: string) => {
        if (href === `/workspaces/${workspaceId}`) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <header className="h-14 bg-[#0f0f10] border-b border-white/10 flex items-center px-4 justify-between sticky top-0 z-50">
            {/* Left: Workspace Context */}
            <div className="flex items-center gap-4">
                {/* Workspace Selector Button */}
                <button
                    onClick={onWorkspaceClick}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    title="Switch Workspace"
                >
                    <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-tiny font-bold",
                        isDefault ? "bg-gray-600 text-white" : "bg-blue-600 text-white"
                    )}>
                        {currentWorkspace?.name?.[0]?.toUpperCase() || 'W'}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-caption font-semibold text-white">
                            {currentWorkspace?.name || 'Loading...'}
                        </span>
                        <span className="text-tiny text-gray-500 ">
                            {isDefault ? 'Default' : `ID: ${workspaceId}`}
                        </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-500 ml-1" />
                </button>

                {/* Workspace Meta */}
                <div className="hidden md:flex items-center gap-3 text-tiny text-gray-500">
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5">
                        <Database size={12} />
                        <span>{documentCount} docs</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5">
                        <Zap size={12} />
                        <span className="">{ragEngine}</span>
                    </div>
                </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-caption font-medium transition-all",
                            isActive(item.href)
                                ? "bg-white text-black"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <item.icon size={16} />
                        <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-tiny font-bold  hover:bg-indigo-500/20 transition-all"
                >
                    <ShieldCheck size={14} />
                    Admin
                </Link>
                <Link
                    href="/"
                    className="text-tiny text-gray-500 hover:text-white px-3 py-1.5 rounded hover:bg-white/5 transition-all"
                >
                    Exit
                </Link>
            </div>
        </header>
    );
}
