"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { KnowledgeBase, KnowledgeBaseActions } from "@/components/knowledge-base";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronLeft, Database, Plus } from "lucide-react";

export default function VaultPage() {
    const [actions, setActions] = useState<KnowledgeBaseActions | null>(null);

    const handleActionsReady = useCallback((a: KnowledgeBaseActions) => {
        setActions(a);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <header className="h-20 border-b border-border flex items-center px-12 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500">
                        <Database size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-none text-foreground">Vault</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {actions && (
                        <>
                            <button
                                onClick={actions.openUpload}
                                className="h-10 px-6 rounded-xl bg-foreground text-background hover:opacity-90 transition-all font-bold text-xs flex items-center gap-2 shadow-lg"
                            >
                                <Plus size={16} />
                                Upload
                            </button>
                        </>
                    )}
                    <Link href="/">
                        <button className="h-10 px-4 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-2">
                            <ChevronLeft size={16} />
                            Back
                        </button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
                    <div className="min-h-[600px] flex flex-col px-1">
                        <KnowledgeBase isGlobal={true} onActionsReady={handleActionsReady} />
                    </div>

                    <footer className="py-6 text-muted-foreground/30 text-[10px] font-bold tracking-widest">
                        KARAG
                    </footer>
                </div>
            </main>
        </div>
    );
}
