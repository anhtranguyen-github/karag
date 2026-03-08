"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfigForm } from "@/components/config/config-form";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { LegacyRouteRedirect } from "@/components/routing/legacy-route-redirect";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import {
  evaluationDatasetFormDefinition,
  evaluationQuestionFormDefinition
} from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import { useUpsertWorkspaceCollection } from "@/lib/local-query";
import type { ExperimentRecord } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4o-mini";

export default function EvaluationPageView() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedKnowledgeDatasetId, setSelectedKnowledgeDatasetId] = useState("");
  const saveExperiment = useUpsertWorkspaceCollection<ExperimentRecord>(tenant.workspaceId, "experiments");

  const evaluationDatasetsQuery = useQuery({
    queryKey: ["evaluation-datasets", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.listEvaluationDatasets(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  const knowledgeDatasetsQuery = useQuery({
    queryKey: ["knowledge-datasets", tenant.organizationId, tenant.projectId, tenant.workspaceId],
    queryFn: () => platformApi.listKnowledgeDatasets(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  useEffect(() => {
    if (!selectedDatasetId && evaluationDatasetsQuery.data?.length) {
      setSelectedDatasetId(evaluationDatasetsQuery.data[0].id);
    }
    if (!selectedKnowledgeDatasetId && knowledgeDatasetsQuery.data?.length) {
      setSelectedKnowledgeDatasetId(knowledgeDatasetsQuery.data[0].id);
    }
  }, [
    evaluationDatasetsQuery.data,
    knowledgeDatasetsQuery.data,
    selectedDatasetId,
    selectedKnowledgeDatasetId
  ]);

  const questionQueries = useQueries({
    queries: (evaluationDatasetsQuery.data ?? []).map((dataset) => ({
      queryKey: ["evaluation-questions", dataset.id],
      queryFn: () => platformApi.listEvaluationQuestions(tenant, dataset.id)
    }))
  });

  const createDataset = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      platformApi.createEvaluationDataset(tenant, {
        workspace_id: tenant.workspaceId!,
        ...values
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["evaluation-datasets", tenant.organizationId, tenant.projectId, tenant.workspaceId]
      });
    }
  });

  const addQuestion = useMutation({
    mutationFn: (values: { question: string; expected_answer: string; expected_context?: string }) =>
      platformApi.createEvaluationQuestion(tenant, selectedDatasetId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["evaluation-questions", selectedDatasetId] });
    }
  });

  const evaluationRun = useMutation({
    mutationFn: () =>
      platformApi.runEvaluation(tenant, selectedDatasetId, {
        knowledge_dataset_id: selectedKnowledgeDatasetId,
        top_k: 3,
        llm_provider: DEFAULT_PROVIDER,
        llm_model: DEFAULT_MODEL
      }),
    onSuccess: async (result) => {
      await saveExperiment.mutateAsync({
        id: result.id,
        workspaceId: tenant.workspaceId!,
        evaluationDatasetId: result.evaluation_dataset_id,
        knowledgeDatasetId: result.knowledge_dataset_id,
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        averageScore: result.average_score,
        totalQuestions: result.total_questions,
        createdAt: result.created_at
      });
    }
  });

  const selectedQuestions =
    questionQueries.find((query, index) => evaluationDatasetsQuery.data?.[index]?.id === selectedDatasetId)
      ?.data ?? [];

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Create benchmark datasets, curate expected answers, and execute evaluation runs against the active knowledge base without mixing these assets into ingestion."
          eyebrow="Benchmarking"
          title="Evaluation datasets and scoring"
        />

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create evaluation dataset</CardTitle>
              <CardDescription>
                Benchmark collections stay structured and bypass document ingestion completely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={evaluationDatasetFormDefinition}
                initialValues={{ workspace_id: tenant.workspaceId ?? "" }}
                loading={createDataset.isPending}
                onSubmit={async (values) => {
                  await createDataset.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add evaluation question</CardTitle>
              <CardDescription>
                Attach expected answers and context hints to the selected evaluation dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SelectDropdown
                label="Target evaluation dataset"
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                options={(evaluationDatasetsQuery.data ?? []).map((dataset) => ({
                  label: dataset.name,
                  value: dataset.id
                }))}
                placeholder="Choose dataset"
                value={selectedDatasetId}
              />
              <ConfigForm
                definition={evaluationQuestionFormDefinition}
                loading={addQuestion.isPending}
                onSubmit={async (values) => {
                  await addQuestion.mutateAsync(values);
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <DataTable
            actions={
              <div className="flex items-center gap-3">
                <SelectDropdown
                  className="min-w-[220px]"
                  label="Dataset"
                  onChange={(event) => setSelectedKnowledgeDatasetId(event.target.value)}
                  options={(knowledgeDatasetsQuery.data ?? []).map((dataset) => ({
                    label: dataset.name,
                    value: dataset.id
                  }))}
                  placeholder="Choose dataset"
                  value={selectedKnowledgeDatasetId}
                />
                <Button
                  disabled={
                    evaluationRun.isPending || !selectedDatasetId || !selectedKnowledgeDatasetId
                  }
                  onClick={() => evaluationRun.mutate()}
                  type="button"
                >
                  <Play className="h-4 w-4" />
                  Run evaluation
                </Button>
              </div>
            }
            columns={[
              {
                key: "question",
                header: "Question",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.question}</div>
                    <div className="text-xs text-muted-foreground">{row.expected_context ?? "No context hint"}</div>
                  </div>
                )
              },
              {
                key: "answer",
                header: "Expected answer",
                render: (row) => (
                  <div className="max-w-[320px] text-sm leading-6 text-slate-700">
                    {row.expected_answer}
                  </div>
                )
              },
              {
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.created_at)
              }
            ]}
            description="Questions and answer keys stored in the selected evaluation dataset."
            rows={selectedQuestions}
            title="Evaluation questions"
          />

          <Card>
            <CardHeader>
              <CardTitle>Last evaluation run</CardTitle>
              <CardDescription>
                Review lexical overlap scores and retrieved contexts from the latest benchmark execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluationRun.data ? (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="text-sm font-medium text-emerald-800">
                      Average score: {(evaluationRun.data.average_score * 100).toFixed(1)}%
                    </div>
                    <div className="mt-1 text-xs text-emerald-700">
                      {evaluationRun.data.total_questions} questions | run {evaluationRun.data.id}
                    </div>
                  </div>
                  {evaluationRun.data.question_results.map((result) => (
                    <div className="rounded-xl border border-border/70 bg-white/70 p-4" key={result.question_id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Badge variant={result.lexical_overlap_score >= 0.5 ? "success" : "warning"}>
                          Score {(result.lexical_overlap_score * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">{result.question_id}</span>
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{result.answer}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                  Run an evaluation to inspect score output and retrieved contexts here.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}

