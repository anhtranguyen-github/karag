'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspaces, Workspace } from '@/hooks/use-workspaces';
import {
  Plus, Search, FileText, MessageSquare,
  Trash2, Loader2, AlertCircle, Database, ShieldCheck,
  LayoutGrid, List, ChevronRight, HardDrive, Shield, X, Info
} from "lucide-react";
import { cn } from '@/lib/utils';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { workspaces, createWorkspace, deleteWorkspace, isLoading, error, refreshWorkspaces } = useWorkspaces();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = async (data: CreateWorkspaceInput) => {
    setIsCreating(true);
    try {
      const result = await createWorkspace(data);
      if (result.success && result.workspace) {
        router.push(`/workspaces/${result.workspace.id}/chat`);
        setShowCreateModal(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterWorkspace = (id: string) => {
    router.push(`/workspaces/${id}/chat`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
      {/* Premium Header */}
      <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield weight="fill" className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-h3 font-black tracking-tight leading-none">Intelligence Hub</h1>
              <p className="text-tiny text-gray-500 font-bold uppercase tracking-widest mt-1">Multi-Workspace Core</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/vault"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 text-tiny font-black tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            <Database size={16} />
            VAULT
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-tiny font-black tracking-widest transition-all shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            CREATE NEW
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-12">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="relative w-full md:max-w-lg group">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-[#121214] border border-white/5 focus:border-blue-500/30 text-caption text-white focus:outline-none focus:ring-4 ring-blue-500/10 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2 p-1 bg-[#121214] border border-white/5 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4"
            >
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-red-400 text-caption font-bold">System Sync Failure</p>
                <p className="text-red-400/60 text-tiny">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspaces Display */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-caption font-bold tracking-widest animate-pulse">SYNCHRONIZING HUBS...</p>
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 rounded-[3rem] bg-white/5 flex items-center justify-center mb-8 border border-white/5 text-gray-700">
              <Shield size={40} />
            </div>
            <h2 className="text-h2 font-black text-white mb-2">No active hubs detected</h2>
            <p className="text-gray-500 text-caption font-medium max-w-sm mb-10 leading-relaxed">
              Create your first intelligence workspace to begin ingesting and analyzing knowledge.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 rounded-2xl bg-white text-black text-tiny font-black tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              INITIALIZE FIRST HUB
            </button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className={cn(
              "gap-6",
              viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
            )}
          >
            {filteredWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                ws={ws}
                viewMode={viewMode}
                onEnter={() => handleEnterWorkspace(ws.id)}
                onDelete={() => setDeletingWorkspace(ws)}
              />
            ))}
          </motion.div>
        )}
      </main>

      {/* Footer Meta */}
      <footer className="max-w-7xl mx-auto px-12 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 text-tiny text-gray-600 font-bold  ">
          <Link href="/admin" className="hover:text-indigo-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck size={14} />
            Admin Core
          </Link>
          <span className="opacity-20">|</span>
          <span className="uppercase tracking-[0.2em]">Protocol v0.8.2-Stable</span>
        </div>
        <p className="text-tiny text-gray-700 font-medium">© 2026 KARAG INTELLIGENCE. ALL RIGHTS RESERVED.</p>
      </footer>

      {/* Create Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onSubmit}
        isCreating={isCreating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteWorkspaceModal
        workspace={deletingWorkspace}
        onClose={() => setDeletingWorkspace(null)}
        onConfirm={async (vaultDelete) => {
          if (deletingWorkspace) {
            await deleteWorkspace(deletingWorkspace.id, vaultDelete);
            setDeletingWorkspace(null);
            refreshWorkspaces();
          }
        }}
      />
    </div>
  );
}

function WorkspaceCard({ ws, viewMode, onEnter, onDelete }: { ws: Workspace, viewMode: 'grid' | 'list', onEnter: () => void, onDelete: () => void }) {
  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        className="group bg-[#121214] rounded-2xl border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.03] transition-all cursor-pointer p-6 flex items-center justify-between"
        onClick={onEnter}
      >
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 text-caption font-black border border-blue-500/20">
            {ws.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-caption font-black text-white group-hover:text-blue-400 transition-colors">{ws.name}</h3>
            <p className="text-tiny text-gray-500 font-medium truncate max-w-md">{ws.description || "No description provided"}</p>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <div className="text-tiny text-gray-600 font-black uppercase tracking-widest mb-1">DOCS</div>
              <div className="text-tiny font-bold text-gray-300">{ws.stats?.doc_count || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-tiny text-gray-600 font-black uppercase tracking-widest mb-1">CHATS</div>
              <div className="text-tiny font-bold text-gray-300">{ws.stats?.thread_count || 0}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="group flex flex-col bg-[#121214] rounded-3xl border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.03] transition-all cursor-pointer overflow-hidden shadow-2xl relative"
      onClick={onEnter}
    >
      <div className="p-8 pb-4">
        <div className="flex items-start justify-between mb-8">
          <div className="w-16 h-16 rounded-[2rem] bg-blue-600 flex items-center justify-center text-h3 font-black text-white shadow-xl shadow-blue-600/20">
            {ws.name[0].toUpperCase()}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all flex items-center justify-center border border-white/5"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <h3 className="text-h3 font-black text-white line-clamp-1 mb-2 group-hover:text-blue-400 transition-colors uppercase tracking-tight">
          {ws.name}
        </h3>
        <p className="text-tiny text-gray-500 font-medium line-clamp-2 h-10 leading-relaxed mb-8">
          {ws.description || "System provisioned intelligence workspace for multi-source knowledge integration."}
        </p>
      </div>

      <div className="mt-auto px-8 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-tiny font-bold text-gray-300">
            <FileText size={14} className="text-gray-600" />
            {ws.stats?.doc_count || 0}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-tiny font-bold text-gray-300">
            <MessageSquare size={14} className="text-gray-600" />
            {ws.stats?.thread_count || 0}
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

function DeleteWorkspaceModal({ workspace, onClose, onConfirm }: { workspace: Workspace | null, onClose: () => void, onConfirm: (vaultDelete: boolean) => Promise<void> }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [vaultDelete, setVaultDelete] = useState(false);

  if (!workspace) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0f0f10] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden p-12 text-center"
      >
        <div className="w-24 h-24 rounded-[3.5rem] bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-8 border border-red-500/20 shadow-2xl shadow-red-500/10">
          <Trash2 size={40} />
        </div>

        <h3 className="text-h2 font-black text-white mb-2 uppercase tracking-tighter">Terminate Hub?</h3>
        <p className="text-caption text-gray-500 font-medium mb-10 leading-relaxed">
          You are about to dismantle <span className="text-white font-bold">{workspace.name}</span>. This action will purge all associated chat threads, indexes, and session logs.
        </p>

        <div className="space-y-4 mb-10">
          <button
            onClick={() => setVaultDelete(!vaultDelete)}
            className={cn(
              "w-full p-6 rounded-3xl border transition-all flex items-center gap-4 text-left group",
              vaultDelete ? "bg-red-500/10 border-red-500/50" : "bg-white/5 border-white/5 hover:border-white/10"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              vaultDelete ? "bg-red-500 text-white" : "bg-white/5 text-gray-600"
            )}>
              <HardDrive size={24} />
            </div>
            <div className="flex-1">
              <div className={cn("text-tiny font-black uppercase tracking-widest", vaultDelete ? "text-red-400" : "text-gray-400")}>Purge Document Vault</div>
              <div className="text-tiny text-gray-600 font-bold">Permanently delete source files from MinIO</div>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
              vaultDelete ? "bg-red-500 border-red-500 text-white" : "border-white/10 bg-black/50"
            )}>
              {vaultDelete && <X size={14} />}
            </div>
          </button>

          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-500/60">
            <Info size={14} className="shrink-0" />
            <p className="text-tiny font-bold leading-none text-left italic">Documents used by other workspaces will remain intact unless purged from the Vault.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={async () => {
              setIsDeleting(true);
              await onConfirm(vaultDelete);
              setIsDeleting(false);
            }}
            disabled={isDeleting}
            className="w-full py-5 rounded-2xl bg-red-500 text-white font-black text-tiny tracking-[0.2em] shadow-2xl shadow-red-500/20 hover:bg-red-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? "PURGING DATA..." : "CONFIRM TERMINATION"}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-5 rounded-2xl bg-white/5 text-gray-400 font-bold text-tiny tracking-[0.1em] hover:bg-white/10 transition-all"
          >
            CANCEL
          </button>
        </div>
      </motion.div>
    </div>
  );
}
