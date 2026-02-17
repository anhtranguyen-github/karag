"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Workspace } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceModal } from "@/components/workspace/create-workspace-modal";

export default function Home() {
  // Client-side fetching for now to simplify interactive state updates
  // In a real RSC app we might use server actions or combine fetch,
  // but for "User is non-technical" and "Simple", client fetch is fine and robust.
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Listen for refresh events or just allow manual refresh
  // For simplicity, we just refetch when modal closes if needed, 
  // but the modal calls router.refresh(). 
  // Since we switched to client component, router.refresh() might not update this state 
  // if we don't use useRefresh hook or similar.
  // Actually, simpler to just trigger a fetch when modal closes successfully.
  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchWorkspaces();
  };

  return (
    <main className="container mx-auto max-w-4xl py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Manage your knowledge bases and chats.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          New Workspace
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/50 border-dashed">
            <h3 className="text-lg font-medium">No workspaces yet</h3>
            <p className="text-muted-foreground mt-1">
              Create your first workspace to get started.
            </p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}/chat`}
              className="block p-6 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg group-hover:text-primary transition-colors">
                    {workspace.name}
                  </h3>
                  {workspace.description && (
                    <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Workspace
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </main>
  );
}
