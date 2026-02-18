"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Workspace } from "@/lib/api";
import { WorkspaceWizard } from "@/components/workspace/WorkspaceWizard";
import { DeleteWorkspaceModal } from "@/components/workspace/delete-workspace-modal";
import { QuickViewWorkspaceModal } from "@/components/workspace/quick-view-modal";
import { Search, Trash2, Eye, Database, Plus, Loader2, ArrowRight, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToView, setWorkspaceToView] = useState<Workspace | null>(null);
  const [providerFilter, setProviderFilter] = useState("all");
  const [engineFilter, setEngineFilter] = useState("all");

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await api.listWorkspacesWorkspacesGet();
      setWorkspaces(response.data);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!workspaceToDelete) return;

    setIsDeleting(workspaceToDelete.id);
    try {
      await api.deleteWorkspaceWorkspacesWorkspaceIdDelete({ workspaceId: workspaceToDelete.id });
      setWorkspaces(workspaces.filter(ws => ws.id !== workspaceToDelete.id));
      setWorkspaceToDelete(null);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws => {
      const matchesSearch = ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProvider = providerFilter === "all" || ws.llm_provider === providerFilter;
      const matchesEngine = engineFilter === "all" || ws.rag_engine === engineFilter;

      return matchesSearch && matchesProvider && matchesEngine;
    });
  }, [workspaces, searchTerm, providerFilter, engineFilter]);

  const uniqueProviders = useMemo(() => {
    const p = new Set(workspaces.map(ws => ws.llm_provider).filter(Boolean));
    return Array.from(p);
  }, [workspaces]);

  const uniqueEngines = useMemo(() => {
    const e = new Set(workspaces.map(ws => ws.rag_engine).filter(Boolean));
    return Array.from(e);
  }, [workspaces]);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto max-w-5xl py-12 px-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-12">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight leading-none text-white">
              Workspaces
            </h1>
            <p className="text-gray-500 text-base font-medium leading-relaxed">
              Create and manage your document collections and AI settings.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/vault">
              <button className="h-11 px-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all font-bold text-[11px] tracking-wide text-gray-400 hover:text-white flex items-center gap-2 active:scale-95 group">
                <Database size={16} />
                Vault
              </button>
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-8 rounded-xl bg-white text-black hover:bg-gray-200 transition-all font-bold text-[11px] tracking-wide flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Plus size={16} />
              New Workspace
            </button>
          </div>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-2 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
            <input
              placeholder="Search workspaces..."
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/[0.03] border border-white/10 focus:border-indigo-500/30 transition-all outline-none font-medium text-white placeholder:text-gray-700 focus:bg-white/[0.05]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select
              title="Provider Filter"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="flex-1 h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/30 transition-all text-gray-400 focus:text-indigo-400"
            >
              <option value="all">ALL PROVIDERS</option>
              {uniqueProviders.map(p => (
                <option key={p} value={p}>{p?.toUpperCase()}</option>
              ))}
            </select>
            <select
              title="Engine Filter"
              value={engineFilter}
              onChange={(e) => setEngineFilter(e.target.value)}
              className="flex-1 h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/30 transition-all text-gray-400 focus:text-emerald-400"
            >
              <option value="all">ALL ENGINES</option>
              {uniqueEngines.map(e => (
                <option key={e} value={e}>{e?.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[280px] rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))
            ) : filteredWorkspaces.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-24 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]"
              >
                <Database size={32} className="text-gray-800 mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">
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
                    className="flex flex-col h-full p-6 rounded-3xl bg-[#121214] border border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all duration-500 shadow-xl relative overflow-hidden group/card cursor-pointer"
                  >
                    {/* Inner Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover/card:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />

                    <div className="flex justify-end items-start mb-4 relative z-10">
                      <div className="flex gap-2">
                        <button
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white transition-all active:scale-90"
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
                      <h3 className="text-xl font-bold text-white group-hover/card:text-indigo-300 transition-colors mb-2 tracking-tight">
                        {workspace.name}
                      </h3>

                      <p className="text-gray-500 text-xs font-medium line-clamp-2 leading-relaxed flex-grow">
                        {workspace.description || "No description provided."}
                      </p>

                      <div className="mt-6 pt-4 border-t border-white/5 flex justify-end items-center">
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
        isDeleting={!!isDeleting}
      />

      <QuickViewWorkspaceModal
        isOpen={!!workspaceToView}
        onClose={() => setWorkspaceToView(null)}
        workspace={workspaceToView}
      />
    </main>
  );
}
