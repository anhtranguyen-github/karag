"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Workspace } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CreateWorkspaceModal } from "@/components/workspace/create-workspace-modal";
import { Search, Trash2, Eye, Library, Plus, Loader2 } from "lucide-react";

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchWorkspaces();
  };

  const handleDeleteWorkspace = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(id);
    try {
      await api.deleteWorkspaceWorkspacesWorkspaceIdDelete({ workspaceId: id });
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      alert("Failed to delete workspace. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleQuickView = (e: React.MouseEvent, workspace: Workspace) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWorkspace(workspace);
  };

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws =>
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workspaces, searchTerm]);

  return (
    <main className="container mx-auto max-w-5xl py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            Manage your knowledge bases and AI interactions.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/vault">
            <Button variant="outline" className="gap-2">
              <Library className="w-4 h-4" />
              Vault
            </Button>
          </Link>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Workspace
          </Button>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspaces..."
          className="pl-10 h-12 bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading workspaces...</p>
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="col-span-full text-center py-20 border rounded-xl bg-muted/30 border-dashed">
            <h3 className="text-xl font-semibold">
              {searchTerm ? "No matches found" : "No workspaces yet"}
            </h3>
            <p className="text-muted-foreground mt-2">
              {searchTerm
                ? `No workspace found for "${searchTerm}"`
                : "Create your first workspace to start building your knowledge base."}
            </p>
            {searchTerm && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setSearchTerm("")}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          filteredWorkspaces.map((workspace) => (
            <div key={workspace.id} className="group relative">
              <Link
                href={`/workspaces/${workspace.id}/chat`}
                className="flex flex-col h-full p-6 border rounded-xl bg-card hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {workspace.name}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={(e) => handleQuickView(e, workspace)}
                      title="Quick View"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteWorkspace(e, workspace.id)}
                      disabled={isDeleting === workspace.id}
                      title="Delete Workspace"
                    >
                      {isDeleting === workspace.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {workspace.description ? (
                  <p className="text-muted-foreground text-sm line-clamp-3 flex-grow">
                    {workspace.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground/50 text-sm italic flex-grow">
                    No description provided.
                  </p>
                )}

                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                    Workspace
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {new Date(workspace.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      {/* Quick View Modal */}
      <Modal
        isOpen={!!selectedWorkspace}
        onClose={() => setSelectedWorkspace(null)}
        title="Workspace Details"
      >
        {selectedWorkspace && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <p className="text-lg font-semibold">{selectedWorkspace.name}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <p className="text-muted-foreground">{selectedWorkspace.description || "No description provided."}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-3 border rounded-lg bg-muted/20">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Created</label>
                <p className="text-sm font-medium">{new Date(selectedWorkspace.created_at || Date.now()).toLocaleString()}</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">ID</label>
                <p className="text-[10px] font-mono truncate">{selectedWorkspace.id}</p>
              </div>
            </div>
            <div className="pt-6 flex justify-end">
              <Link href={`/workspaces/${selectedWorkspace.id}/chat`} className="w-full">
                <Button className="w-full">Open Workspace</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
