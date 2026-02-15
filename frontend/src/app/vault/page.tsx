'use client';

import { KnowledgeBase } from '@/components/knowledge-base';
import { Database, Shield, Layers, HardDrive, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GlobalVaultPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0b]">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Database size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight ">Vault</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-tiny text-gray-500 font-bold  ">Document Management</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Main UI */}
                    <KnowledgeBase isGlobal={true} />
                </div>
            </main>

        </div>
    );
}
