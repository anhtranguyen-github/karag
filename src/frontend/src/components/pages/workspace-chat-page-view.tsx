"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ConfigForm } from "@/components/config/config-form";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { ragQueryFormDefinition } from "@/lib/form-definitions";
import { useWorkspaceRecord } from "@/lib/local-query";
import type { WorkspaceContextDocumentSelection } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

const contextFallback: WorkspaceContextDocumentSelection = {
  workspaceId: "",
  documentIds: []
};

export default function WorkspaceChatPageView() {
  const { tenant } = useTenant();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const knowledgeDatasetsQuery = useQuery({
    queryKey: ["workspace-chat", "knowledge-datasets", tenant.workspaceId],
    queryFn: () => platformApi.listKnowledgeDatasets(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });
  const ragConfigQuery = useQuery({
    queryKey: ["workspace-rag-config", tenant.workspaceId],
    queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  const contextQuery = useWorkspaceRecord(tenant.workspaceId, "context-documents", contextFallback);

  useEffect(() => {
    if (!selectedDatasetId && knowledgeDatasetsQuery.data?.length) {
      setSelectedDatasetId(knowledgeDatasetsQuery.data[0].id);
    }
  }, [knowledgeDatasetsQuery.data, selectedDatasetId]);

  const defaultValues = useMemo(
    () => ({
      query: "",
      top_k: ragConfigQuery.data?.retrieval_config.top_k ?? 3,
      llm_provider: ragConfigQuery.data?.llm_config.provider ?? "openai",
      llm_model: ragConfigQuery.data?.llm_config.model ?? "gpt-4o-mini"
    }),
    [ragConfigQuery.data]
  );

  const ragQuery = useMutation({
    mutationFn: (values: { query: string; top_k: number; llm_provider: string; llm_model: string }) =>
      platformApi.ragQuery(tenant, {
        workspace_id: tenant.workspaceId!,
        knowledge_dataset_id: selectedDatasetId,
        query: values.query,
        top_k: values.top_k,
        llm_provider: values.llm_provider,
        llm_model: values.llm_model
      })
  });

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Workspace" title="Chat" />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Context docs" value={contextQuery.data?.documentIds.length ?? 0} />
          <MetricCard label="Datasets" value={knowledgeDatasetsQuery.data?.length ?? 0} />
          <MetricCard label="Model" value={ragConfigQuery.data?.llm_config.model ?? "gpt-4o-mini"} />
          <MetricCard label="Top K" value={ragConfigQuery.data?.retrieval_config.top_k ?? 3} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Run query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectDropdown
                label="Dataset"
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                options={(knowledgeDatasetsQuery.data ?? []).map((dataset) => ({
                  label: dataset.name,
                  value: dataset.id
                }))}
                placeholder="Choose dataset"
                value={selectedDatasetId}
              />
              <ConfigForm
                definition={ragQueryFormDefinition}
                initialValues={defaultValues}
                loading={ragQuery.isPending}
                onSubmit={async (values) => {
                  await ragQuery.mutateAsync(values);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ragQuery.data ? (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="font-medium text-slate-900">{ragQuery.data.answer}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {ragQuery.data.provider} / {ragQuery.data.model} / {ragQuery.data.usage.total_tokens} tokens
                    </div>
                  </div>
                  <div className="space-y-3">
                    {ragQuery.data.chunks.map((chunk) => (
                      <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={chunk.chunk_id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-900">{chunk.document_title}</span>
                          <Badge variant="muted">Score {chunk.score.toFixed(3)}</Badge>
                        </div>
                        <p className="text-sm leading-7 text-slate-700">{chunk.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                  Run a query to inspect the answer and retrieved chunks.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}
