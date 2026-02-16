'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { DocumentManager } from '@/components/documents/document-manager';
import { FileText, Database, Shield } from 'lucide-react';

export default function DocumentsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0b] overflow-hidden">
            {/* Context Header */}
            <div className="px-8 pt-8 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-h2 font-black text-white uppercase tracking-tighter leading-none">Knowledge Core</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Workspace Ingestion Matrix</p>
                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Local Context Scope</span>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-0.5">Retrievability</p>
                        <p className="text-tiny font-black text-emerald-500 uppercase tracking-tight">Level 4-Optimal</p>
                    </div>
                    <div className="w-px h-10 bg-white/5" />
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-0.5">Encryption</p>
                        <p className="text-tiny font-black text-blue-500 uppercase tracking-tight">AES-256-System</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <DocumentManager workspaceId={workspaceId} />
            </main>
        </div>
    );
}
