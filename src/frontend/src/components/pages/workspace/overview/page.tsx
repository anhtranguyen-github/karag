"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Files, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageShell from "@/components/ui/page-shell";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceOverviewPage() {
  const { tenant, isReady } = useTenant();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workspaceId = params.workspaceId as string;

  const { data: documents } = useQuery({
    queryKey: ["workspace-overview", "documents", workspaceId],
    queryFn: () => platformApi.listRuntimeDocuments(tenant, workspaceId),
    enabled: isReady && !!workspaceId,
  });

  const { data: health } = useQuery({
    queryKey: ["workspace-overview", "health"],
    queryFn: platformApi.dependencyHealth,
  });

  const metrics = [
    { label: "Documents", value: String(documents?.length ?? 0) },
    { label: "Vector Store", value: health?.providers.vector_store || "unknown" },
    { label: "LLM", value: health?.providers.llm_provider || "unknown" },
  ];

  return (
    <WorkspaceGuard>
      <div className="flex-1 p-8 space-y-8 animate-in fade-in-from-bottom-4 duration-700 max-w-[1520px] mx-auto w-full">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold font-display tracking-tight text-foreground">Workspace Operational Overview</h2>
            <p className="text-muted-foreground mt-1 text-lg">Real-time telemetry and infrastructure status for <span className="text-primary font-medium">Workspace</span>.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="bg-card border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-all flex items-center gap-2"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["workspace-overview", "documents", workspaceId] });
                queryClient.invalidateQueries({ queryKey: ["workspace-overview", "health"] });
                queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents", workspaceId] });
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Re-sync Vector Store
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/10 transition-colors"
              onClick={() => router.push(generateWorkspaceUrl(workspaceId, "settings"))}
              type="button"
            >
              View Config
            </button>
          </div>
        </section>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Metric Cards (Row 1) */}
          <div className="col-span-12 md:col-span-4 bg-card p-6 rounded-xl relative overflow-hidden group border border-border">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Document Count</p>
                <h3 className="text-5xl font-extrabold font-display text-primary">{documents?.length ?? 0}</h3>
              </div>
              <span className="material-symbols-outlined text-primary/20 text-4xl">database</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-primary font-medium">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>Updated recently</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-card p-6 rounded-xl relative overflow-hidden group border-l-2 border-primary border-y border-r border-border">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Vector Store Status</p>
                <h3 className="text-3xl font-extrabold font-display text-foreground mt-2">{health?.providers.vector_store || "Unknown"}</h3>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 animate-pulse">
                <span className="w-3 h-3 bg-primary rounded-full shadow-[0_0_12px_rgba(173,198,255,0.8)]"></span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium font-mono uppercase tracking-widest">
              State: Operational
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-card p-6 rounded-xl relative overflow-hidden group border border-border">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">LLM Provider</p>
                <h3 className="text-3xl font-extrabold font-display text-foreground mt-2">{health?.providers.llm_provider || "Unknown"}</h3>
              </div>
              <span className="material-symbols-outlined text-muted-foreground/20 text-4xl">smart_toy</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Active Provider
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-foreground/5 rounded-full blur-2xl group-hover:bg-foreground/10 transition-all"></div>
          </div>

          {/* Quick Access Tiles (Row 2 - Left) */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href={generateWorkspaceUrl(workspaceId, "chat")} className="bg-muted/30 rounded-xl p-6 hover:bg-muted transition-all cursor-pointer group border border-border">
              <span className="material-symbols-outlined text-primary mb-4 block text-3xl">forum</span>
              <h4 className="font-display font-bold text-lg mb-1">Workspace Chat</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Engage with your RAG instance directly.</p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-widest">Launch <span className="material-symbols-outlined text-xs">arrow_forward</span></span>
              </div>
            </Link>

            <Link href={generateWorkspaceUrl(workspaceId, "history")} className="bg-muted/30 rounded-xl p-6 hover:bg-muted transition-all cursor-pointer group border border-border">
              <span className="material-symbols-outlined text-primary mb-4 block text-3xl">history</span>
              <h4 className="font-display font-bold text-lg mb-1">Thread History</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Review past sessions and trace output.</p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-widest">Open <span className="material-symbols-outlined text-xs">arrow_forward</span></span>
              </div>
            </Link>

            <Link href={generateWorkspaceUrl(workspaceId, "context-docs")} className="bg-muted/30 rounded-xl p-6 hover:bg-muted transition-all cursor-pointer group border border-border">
              <span className="material-symbols-outlined text-primary mb-4 block text-3xl">folder_managed</span>
              <h4 className="font-display font-bold text-lg mb-1">Context Docs</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Manage source material and embeddings.</p>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-widest">Browse <span className="material-symbols-outlined text-xs">arrow_forward</span></span>
              </div>
            </Link>

            {/* System Health Panel (Large Span) */}
            <div className="col-span-1 md:col-span-3 bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-display font-bold">System Health</h4>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary"></span> All Systems Operational
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-popover p-4 rounded-lg flex items-center justify-between border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vector Store</p>
                    <p className="text-sm font-medium mt-1">{health?.providers.vector_store || "Unknown"}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="bg-popover p-4 rounded-lg flex items-center justify-between border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Storage Provider</p>
                    <p className="text-sm font-medium mt-1">{health?.providers.storage_provider || "Unknown"}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="bg-popover p-4 rounded-lg flex items-center justify-between border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LLM Gateway</p>
                    <p className="text-sm font-medium mt-1">{health?.providers.llm_provider || "Unknown"}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed (Row 2 - Right) */}
          <div className="col-span-12 lg:col-span-4 bg-card p-6 rounded-xl overflow-hidden relative border border-border">
            <h4 className="text-xl font-display font-bold mb-6">Recent Activity</h4>
            <div className="space-y-6 relative">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border"></div>
              
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                </div>
                <p className="text-sm font-medium text-foreground">Workspace Initialized</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ready for intelligence cycles</p>
                <p className="text-[10px] text-primary mt-1 font-mono uppercase tracking-widest">System</p>
              </div>

              {documents && documents.length > 0 && (
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px]">upload_file</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{documents[0].title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Document attached to context</p>
                  <p className="text-[10px] text-primary mt-1 font-mono uppercase tracking-widest">RAG Engine</p>
                </div>
              )}
            </div>
            
            <button
              className="w-full mt-8 py-2 text-xs font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors border-t border-border pt-4 flex items-center justify-center gap-2 uppercase"
              onClick={() => router.push(generateWorkspaceUrl(workspaceId, "history"))}
              type="button"
            >
              View Audit Log
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </button>
          </div>
        </div>
      </div>
    </WorkspaceGuard>
  );
}
