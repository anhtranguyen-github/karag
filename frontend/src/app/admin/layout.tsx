'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#0a0a0b]">
            {/* Compact top bar instead of sidebar */}
            <div className="border-b border-white/5 bg-[#0a0a0b] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                            <ShieldCheck size={16} />
                        </div>
                        <div>
                            <h2 className="text-tiny font-black tracking-tight uppercase text-white">Admin Console</h2>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">System Root</span>
                            </div>
                        </div>
                    </div>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft size={12} />
                        Back to App
                    </Link>
                </div>
            </div>
            <main className="overflow-y-auto custom-scrollbar">
                {children}
            </main>
        </div>
    );
}
