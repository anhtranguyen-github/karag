"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Settings, Trash2, ChevronRight, Info, Sliders, Cpu, Database, ShieldAlert } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceSettingsPage() {
  const { tenant } = useTenant();
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const queryClient = useQueryClient();

  const { data: ragConfig } = useQuery({
    queryKey: ["workspace-settings", "rag-config", workspaceId],
    queryFn: () => platformApi.getWorkspaceRagConfig(tenant, workspaceId),
    enabled: !!workspaceId,
  });

  const [provider, setProvider] = useState<string | undefined>();
  const [model, setModel] = useState<string | undefined>();
  const [vectorStore, setVectorStore] = useState<string | undefined>();
  const [collection, setCollection] = useState<string | undefined>();

  useEffect(() => {
    if (ragConfig) {
      setProvider(ragConfig.llm?.provider ?? undefined);
      setModel(ragConfig.llm?.model ?? undefined);
      setVectorStore(ragConfig.vectorstore?.component ?? undefined);
      setCollection(ragConfig.vectorstore?.collection_name ?? undefined);
    }
  }, [ragConfig]);

  const updateMutation = useMutation({
    mutationFn: (body: any) => platformApi.updateWorkspaceRagConfig(tenant, workspaceId, body),
    onSuccess: () => queryClient.invalidateQueries(["workspace-settings", "rag-config", workspaceId]),
  });

  const deleteMutation = useMutation({
    mutationFn: () => platformApi.deleteWorkspace(tenant, workspaceId),
    onSuccess: () => router.push(`/dashboard/project/${tenant.projectId}`),
  });

  return (
    <WorkspaceGuard>
      <PageShell title="Workspace Control" scopeLabel="Workspace" subtitle="Fine-tune your engine and manage lifecycle.">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50">
              <Settings />
            </div>
            <div>
              <h2 className="text-xl font-bold">RAG Defaults</h2>
              <p className="text-sm text-slate-500">Global settings for retrieval and generation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>LLM Provider</Label>
              <Input value={provider ?? ""} onChange={(e) => setProvider(e.target.value)} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={model ?? ""} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div>
              <Label>Vector Store</Label>
              <Input value={vectorStore ?? ""} onChange={(e) => setVectorStore(e.target.value)} />
            </div>
            <div>
              <Label>Collection</Label>
              <Input value={collection ?? ""} onChange={(e) => setCollection(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button onClick={() => updateMutation.mutate({ ...ragConfig, llm: { provider, model }, vectorstore: { ...ragConfig?.vectorstore, component: vectorStore, collection_name: collection } })}>
              <Save /> Save
            </Button>
            <Button variant="ghost" onClick={() => { if (confirm('Delete workspace?')) deleteMutation.mutate(); }}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      </PageShell>
    </WorkspaceGuard>
  );
}
