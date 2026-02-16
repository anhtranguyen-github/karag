'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
  Plus, Search, FileText, MessageSquare,
  Trash2, Loader2, AlertCircle, Database, ShieldCheck
} from "lucide-react";
import { cn } from '@/lib/utils';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';

export default function HomePage() {
  const router = useRouter();
  const { workspaces, createWorkspace, deleteWorkspace, isLoading, error } = useWorkspaces();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = async (data: CreateWorkspaceInput) => {
    setIsCreating(true);
    try {
      const result = await createWorkspace(data);

      if (result.success && result.workspace) {
        router.push(`/workspaces/${result.workspace.id}`);
        setShowCreateModal(false);
      }
    } finally {
      setIsCreating(false);
    }
  };


  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteWorkspace(id);
    setDeletingId(null);
  };

  const handleEnterWorkspace = (id: string) => {
    router.push(`/workspaces/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-h3 font-bold">Workspaces</h1>
            <p className="text-caption text-gray-500">Select or create a workspace to begin</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 text-caption font-medium transition-all"
            >
              <ShieldCheck size={16} />
              Admin Console
            </Link>
            <Link
              href="/vault"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 text-caption font-medium transition-all"
            >
              <Database size={16} />
              Vault
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-caption font-medium transition-all"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-caption focus:outline-none focus:ring-2 ring-blue-500/50"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-red-400 text-caption">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No workspaces found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-caption"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          /* Workspace Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkspaces.map((ws) => (
              <div
                key={ws.id}
                className={cn(
                  "group bg-[#121214] rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden",
                  ws.id === 'default' && "border-gray-500/30"
                )}
                onClick={() => handleEnterWorkspace(ws.id)}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-caption font-bold bg-blue-600">
                        {ws.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{ws.name}</h3>
                        <p className="text-tiny text-gray-500">ID: {ws.id}</p>
                      </div>
                    </div>
                    {/* Actions */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                      disabled={deletingId === ws.id}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                      title="Delete workspace"
                    >
                      {deletingId === ws.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                < div className="p-4" >
                  {
                    ws.description && (
                      <p className="text-caption text-gray-400 mb-3 line-clamp-2">{ws.description}</p>
                    )
                  }

                  < div className="flex items-center gap-4 text-tiny text-gray-500" >
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {ws.stats?.doc_count || 0} docs
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {ws.stats?.thread_count || 0} chats
                    </span>
                  </div>
                </div>
              </div >
            ))
            }
          </div >
        )}
      </main >

      {/* Create Modal */}
      < CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onSubmit}
        isCreating={isCreating}
      />
    </div >
  );
}
