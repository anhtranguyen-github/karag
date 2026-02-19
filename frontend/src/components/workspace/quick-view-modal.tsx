"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Info, Brain, CheckCircle2, HardDrive } from "lucide-react";
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
        <Modal isOpen={isOpen} onClose={onClose} title="Workspace Details">
            <div className="flex flex-col gap-6 p-2">
                {/* Header Section */}
                <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <HardDrive size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight text-foreground">{workspace.name}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID: {workspace.id}</p>
                    </div>
                </div>

                {/* About/Description */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Info size={12} />
                        About
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed bg-secondary p-4 rounded-xl border border-border">
                        {workspace.description || "No description provided for this workspace."}
                    </p>
                </div>

                {/* Tech Specs Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            <Brain size={12} />
                            AI Setup
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                            <div>
                                <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">AI Model</span>
                                <span className="text-xs font-bold text-foreground">{workspace.llmProvider || "Auto"}</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Search Engine</span>
                                <span className="text-xs font-bold text-foreground">{workspace.embeddingProvider || "Auto"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            <CheckCircle2 size={12} />
                            Status
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center h-[96px]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Healthy</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground leading-tight">Your workspace is active and ready to use.</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4">
                    <Button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl text-[10px] font-black tracking-widest uppercase bg-secondary hover:bg-muted text-foreground border border-border transition-all active:scale-[0.98]"
                    >
                        Close Details
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
