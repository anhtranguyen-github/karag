'use client';

import { useParams } from 'next/navigation';
import { SettingsManager } from '@/components/settings-manager';
import { Wrench, Shield, Activity, Cpu } from 'lucide-react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { motion } from 'framer-motion';

export default function SettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { workspaces } = useWorkspaces();
    const currentWorkspace = workspaces.find(w => w.id === workspaceId);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0b] overflow-hidden">
            {/* Minimal Header */}
            <header className="px-10 py-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <h1 className="text-h2 font-black text-white uppercase tracking-tighter leading-none">System Settings</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">{currentWorkspace?.name || 'Workspace Core'}</p>
                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                            <span className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest ">Admin Authority Level 4</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="hidden xl:flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">System Load</p>
                            <p className="text-tiny font-black text-white uppercase tracking-tight">Normal-Optimal</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Activity size={16} />
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/5" />
                    <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5">
                        <Shield size={16} className="text-gray-500" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest ">Master Key Active</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-10 pb-10 overflow-hidden">
                <div className="h-full max-w-7xl mx-auto shadow-3xl shadow-black/80">
                    <SettingsManager workspaceId={workspaceId} workspaceName={currentWorkspace?.name} />
                </div>
            </main>
        </div>
    );
}
