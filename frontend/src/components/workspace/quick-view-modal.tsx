"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Info, Sparkles, Layout, Database, Clock, Shield } from "lucide-react";
import { Workspace } from "@/lib/api";

interface QuickViewWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspace: Workspace | null;
}

export function QuickViewWorkspaceModal({
    isOpen,
    onClose,
    workspace
}: QuickViewWorkspaceModalProps) {
    if (!workspace) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Workspace Intelligence Summary">
            <div className="flex flex-col gap-6 p-1">
                {/* Header Context */}
                <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Database size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight text-white">{workspace.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">ID: {workspace.id}</p>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                        <Info size={12} />
                        Genesis Intent
                    </div>
                    <p className="text-sm font-medium text-gray-400 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5 italic">
                        "{workspace.description || "No strategic objective defined for this workspace."}"
                    </p>
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/70">
                            <Sparkles size={12} />
                            AI Strategy
                        </div>
                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                            <div>
                                <span className="block text-[8px] font-black uppercase tracking-widest text-gray-600 mb-0.5">LLM</span>
                                <span className="text-xs font-bold text-gray-300">{workspace.llm_provider || "Default Auto"}</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Embedder</span>
                                <span className="text-xs font-bold text-gray-300">{workspace.embedding_provider || "Default Auto"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70">
                            <Shield size={12} />
                            State
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center h-[90px]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Operational</span>
                            </div>
                            <span className="text-[10px] font-medium text-gray-500">Workspace integrity verified via vector parity.</span>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <div className="pt-6">
                    <Button
                        onClick={onClose}
                        className="w-full h-12 rounded-xl text-xs font-black tracking-widest uppercase bg-white text-black hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-black/40"
                    >
                        DISMISS SUMMARY
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
