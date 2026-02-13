'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Cpu,
    Settings,
    Activity,
    Zap,
    ArrowLeft,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Providers', href: '/admin/providers', icon: Cpu },
    { name: 'Global Settings', href: '/admin/settings', icon: Settings },
    { name: 'Metrics', href: '/admin/metrics', icon: Activity },
    { name: 'Traces', href: '/admin/traces', icon: Zap },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen bg-[#0a0a0b] border-r border-white/5 flex flex-col sticky top-0">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h2 className="text-caption font-black tracking-tight uppercase">Admin Console</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-tiny text-gray-500 font-bold uppercase tracking-widest">System Root</span>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-caption font-medium transition-all group relative",
                                    isActive
                                        ? "bg-white/5 text-white"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} className={cn(
                                    "transition-colors",
                                    isActive ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"
                                )} />
                                {item.name}
                                {isActive && (
                                    <motion.div
                                        layoutId="admin-active-pill"
                                        className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-8 pt-0">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-tiny font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                    <ArrowLeft size={14} />
                    Back to App
                </Link>
            </div>
        </aside>
    );
}
