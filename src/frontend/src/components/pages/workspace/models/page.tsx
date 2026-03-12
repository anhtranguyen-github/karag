"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/ui/page-shell";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { useRuntimeModels } from "@/hooks/useRuntimeModels";

export default function WorkspaceModelsPage() {
  const runtime = useRuntimeModels();
  const [search, setSearch] = useState("");

  const models = useMemo(() => {
    const result: Array<{ provider: string; name: string; type: string }> = [];
    for (const entry of runtime.data ?? []) {
      for (const model of entry.models) {
        result.push({ provider: entry.provider, name: model, type: entry.kind });
      }
    }
    return result.filter((model) =>
      `${model.provider} ${model.name} ${model.type}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [runtime.data, search]);

  return (
    <WorkspaceGuard>
      <PageShell
        scopeLabel="Workspace"
        title="Runtime Models"
        subtitle="Detected inference, embedding, and reranking models in one simplified catalog."
      >
        <div className="app-panel px-5 py-5 md:px-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search models" value={search} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => (
            <Card key={`${model.provider}-${model.name}`}>
              <CardHeader>
                <p className="section-label">{model.provider}</p>
                <CardTitle className="mt-2">{model.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="status-pill">{model.type}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    </WorkspaceGuard>
  );
}
