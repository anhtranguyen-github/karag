'use client';

import React from 'react';
import { DocumentManager } from '@/components/documents/document-manager';
import { Database, HardDrive, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GlobalVaultPage() {
    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0b] overflow-hidden">
            {/* System Header */}
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                        <HardDrive size={22} />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black tracking-tight text-white uppercase leading-none">Global Vault</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] ">Central Storage Controller</span>
                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                            <span className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest ">Master Registry</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                    <div className="hidden md:block">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-0.5">Persistence Layer</p>
                        <p className="text-tiny font-black text-white uppercase tracking-tight">Active MinIO Core</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        <Shield size={20} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <DocumentManager isGlobal={true} />
                </div>
            </main>
        </div>
    );
}
