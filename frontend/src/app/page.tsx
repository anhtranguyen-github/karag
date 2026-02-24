"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Workspace } from "@/lib/api";
import { WorkspaceWizard } from "@/components/workspace/WorkspaceWizard";
import { DeleteWorkspaceModal } from "@/components/workspace/delete-workspace-modal";
import { QuickViewWorkspaceModal } from "@/components/workspace/quick-view-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Trash2, Eye, Database, Plus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/context/toast-context";

export default function Home() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToView, setWorkspaceToView] = useState<Workspace | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await api.listWorkspacesWorkspacesGet();
      const data = response.data || [];
      const mappedData = data.map((ws: Workspace & { llm_provider?: string, embedding_provider?: string, rag_engine?: string }) => ({
        ...ws,
        llmProvider: ws.llm_provider,
        embeddingProvider: ws.embedding_provider,
        ragEngine: ws.rag_engine
      }));
      setWorkspaces(mappedData);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async (vaultDelete: boolean) => {
    if (!workspaceToDelete) return;

    const wsName = workspaceToDelete.name;
    const toastId = toast.loading(`${vaultDelete ? 'Purging' : 'Removing'} workspace ${wsName}...`);

    setWorkspaceToDelete(null); // Close modal immediately

    try {
      await api.deleteWorkspaceWorkspacesWorkspaceIdDelete({ workspaceId: workspaceToDelete.id, vaultDelete });
      toast.dismiss(toastId);
      toast.success(`Workspace ${wsName} successfully ${vaultDelete ? 'purged' : 'removed'}`);
      setWorkspaces(workspaces.filter(ws => ws.id !== workspaceToDelete.id));
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(`Failed to delete workspace ${wsName}`);
      console.error("Failed to delete workspace:", error);
    }
  };

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws => {
      return ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.description?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [workspaces, searchTerm]);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto max-w-5xl py-12 px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-12">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight leading-none">
              Workspaces
            </h1>
            <p className="text-muted-foreground text-base font-medium leading-relaxed">
              Create and manage your document collections and AI settings.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/vault">
              <button className="h-11 px-6 rounded-xl bg-secondary border border-border hover:bg-muted transition-all font-bold text-[11px] tracking-wide text-muted-foreground hover:text-foreground flex items-center gap-2 active:scale-95 group">
                <Database size={16} />
                Vault
              </button>
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-8 rounded-xl bg-foreground text-background hover:opacity-90 transition-all font-bold text-[11px] tracking-wide flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Plus size={16} />
              New Workspace
            </button>
          </div>
        </div>

        {/* Search & Stats */}
        <div className="max-w-xl mx-auto mb-12 relative group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
          <input
            placeholder="Search environments by name or identifier..."
            className="w-full h-16 pl-16 pr-6 rounded-[2rem] bg-secondary border border-border focus:border-indigo-500/30 transition-all outline-none font-bold text-lg text-foreground placeholder:text-muted-foreground focus:bg-muted shadow-2xl shadow-indigo-500/5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[280px] rounded-3xl bg-card/50 border border-border animate-pulse" />
              ))
            ) : filteredWorkspaces.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-24 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-secondary/30"
              >
                <Database size={32} className="text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold text-muted-foreground mb-1">
                  {searchTerm ? "No results" : "Empty"}
                </h3>
              </motion.div>
            ) : (
              filteredWorkspaces.map((workspace, idx) => (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative h-[280px]"
                >
                  <div
                    onClick={() => router.push(`/chats/new?workspaceId=${workspace.id}`)}
                    className="flex flex-col h-full p-6 rounded-3xl bg-card border border-border hover:border-indigo-500/40 hover:bg-secondary/20 transition-all duration-500 shadow-xl relative overflow-hidden group/card cursor-pointer"
                  >
                    {/* Inner Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover/card:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />

                    <div className="flex justify-end items-start mb-4 relative z-10">
                      <div className="flex gap-2">
                        <button
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-90"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setWorkspaceToView(workspace);
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setWorkspaceToDelete(workspace);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      <h3 className="text-xl font-bold text-card-foreground group-hover/card:text-indigo-400 transition-colors mb-2 tracking-tight">
                        {workspace.name}
                      </h3>

                      <p className="text-muted-foreground text-xs font-medium line-clamp-2 leading-relaxed flex-grow">
                        {workspace.description || "No description provided."}
                      </p>

                      <div className="mt-6 pt-4 border-t border-border flex justify-end items-center">
                        <div className="flex items-center gap-1 text-indigo-400 font-bold text-[9px] uppercase tracking-wider group-hover/card:translate-x-1 transition-transform">
                          Open
                          <ArrowRight size={10} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* System Footer */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-800 font-bold text-[10px] tracking-widest">
          <div className="flex gap-8">
            <span>SECURE</span>
          </div>
        </div>
      </div>

      <WorkspaceWizard
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchWorkspaces();
        }}
      />

      <DeleteWorkspaceModal
        isOpen={!!workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleConfirmDelete}
        workspace={workspaceToDelete}
      />

      <QuickViewWorkspaceModal
        isOpen={!!workspaceToView}
        onClose={() => setWorkspaceToView(null)}
        workspace={workspaceToView}
      />
    </main>
  );
}
