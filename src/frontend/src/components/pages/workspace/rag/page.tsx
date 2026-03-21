"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDown, CheckCircle2, GitBranch, ShieldAlert, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import type { RagPipelineAudit, WorkspaceRagConfig, WorkspaceRagConfigUpdate } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

function toUpdatePayload(config: WorkspaceRagConfig): WorkspaceRagConfigUpdate {
	const { workspace_id, updated_at, ...rest } = config;
	return rest;
}

function toCandidatePayload(draft: WorkspaceRagConfigUpdate): WorkspaceRagConfigUpdate {
	return draft;
}

function PipelineGraph({ stages }: Readonly<{ stages: string[] }>) {
	return (
		<div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
			{stages.map((stage, index) => (
				<div className="flex items-center gap-3" key={`${stage}-${index}`}>
					<div className="flex h-10 min-w-32 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
						{stage}
					</div>
					{index < stages.length - 1 ? <ArrowDown className="h-4 w-4 text-slate-400" /> : null}
				</div>
			))}
		</div>
	);
}

export default function WorkspaceRagSettingsPage() {
	const { tenant } = useTenant();
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState<WorkspaceRagConfigUpdate | null>(null);
	const [preview, setPreview] = useState<RagPipelineAudit | null>(null);

	const configQuery = useQuery({
		queryKey: ["workspace-rag-config", tenant.workspaceId],
		queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
		enabled: Boolean(tenant.workspaceId)
	});

	const auditQuery = useQuery({
		queryKey: ["workspace-rag-audit", tenant.workspaceId],
		queryFn: () => platformApi.getWorkspaceRagPipelineAudit(tenant, tenant.workspaceId!),
		enabled: Boolean(tenant.workspaceId)
	});

	useEffect(() => {
		if (!configQuery.data) {
			return;
		}
		setDraft(toUpdatePayload(configQuery.data));
	}, [configQuery.data]);

	const available = auditQuery.data?.available_components ?? {
		query_transformer: ["identity", "hyde"],
		embedder: ["dense", "multi_vector", "graph"],
		vectorstore: ["pgvector", "qdrant"],
		retriever: ["vector", "hybrid"],
		reranker: ["none", "colbert"],
		generator: ["openai"]
	};

	const validateMutation = useMutation({
		mutationFn: (body: WorkspaceRagConfigUpdate) =>
			platformApi.validateWorkspaceRagPipeline(tenant, tenant.workspaceId!, body),
		onSuccess: (data) => {
			setPreview(data);
		}
	});

	const saveMutation = useMutation({
		mutationFn: (body: WorkspaceRagConfigUpdate) =>
			platformApi.updateWorkspaceRagConfig(tenant, tenant.workspaceId!, body),
		onSuccess: (data) => {
			queryClient.setQueryData(["workspace-rag-config", tenant.workspaceId], data);
			queryClient.invalidateQueries({ queryKey: ["workspace-rag-audit", tenant.workspaceId] });
			setPreview(null);
		}
	});

	const activeAudit = preview ?? auditQuery.data;
	const compatibilityErrors = useMemo(
		() => activeAudit?.compatibility.filter((check) => check.status === "error") ?? [],
		[activeAudit]
	);

	function updateDraft(patch: Partial<WorkspaceRagConfigUpdate>) {
		setPreview(null);
		setDraft((current) => {
			if (!current) {
				return current;
			}
			return {
				...current,
				...patch,
				embedding: {
					...current.embedding,
					...patch.embedding
				},
				vectorstore: {
					...current.vectorstore,
					...patch.vectorstore
				},
				retriever: {
					...current.retriever,
					...patch.retriever
				},
				reranker: {
					...current.reranker,
					...patch.reranker
				},
				rag: {
					...current.rag,
					...patch.rag
				}
			};
		});
	}

	async function handleValidate() {
		if (!draft) {
			return;
		}
		await validateMutation.mutateAsync(toCandidatePayload(draft));
	}

	async function handleApply() {
		if (!draft) {
			return;
		}
		const candidate = toCandidatePayload(draft);
		const validated = preview ?? (await validateMutation.mutateAsync(candidate));
		if (!validated.valid) {
			return;
		}
		await saveMutation.mutateAsync(candidate);
	}

	return (
		<WorkspaceGuard>
			<div className="grid gap-6">
				<PageHeader
					eyebrow="Admin Dashboard"
					title="RAG Pipeline Audit"
					description="Audit the active pipeline, validate component compatibility, and apply changes only when the configuration is safe."
				/>

				<div className="grid gap-4 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<GitBranch className="h-4 w-4 text-orange-500" />
								Current Pipeline
							</CardTitle>
							<CardDescription>Live stage implementations resolved from workspace configuration.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{Object.entries(activeAudit?.current_pipeline ?? {}).map(([label, value]) => (
								<div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2" key={label}>
									<span className="font-medium text-slate-500">{label}</span>
									<span className="font-semibold text-slate-900">{value}</span>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<Activity className="h-4 w-4 text-sky-600" />
								Compatibility Status
							</CardTitle>
							<CardDescription>Strict Embedder ↔ VectorStore ↔ Retriever validation.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{(activeAudit?.compatibility ?? []).map((check) => (
								<div className="rounded-xl border border-slate-200 px-3 py-3" key={`${check.name}-${check.message}`}>
									<div className="flex items-center justify-between gap-2">
										<span className="font-semibold text-slate-900">{check.name}</span>
										<Badge variant={check.status === "ok" ? "secondary" : "danger"}>
											{check.status.toUpperCase()}
										</Badge>
									</div>
									<p className="mt-2 text-slate-600">{check.message}</p>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<SlidersHorizontal className="h-4 w-4 text-violet-600" />
								Pipeline Graph
							</CardTitle>
							<CardDescription>Operational view of enabled stages in execution order.</CardDescription>
						</CardHeader>
						<CardContent>
							<PipelineGraph stages={activeAudit?.pipeline_graph ?? ["query", "embed", "retrieve", "generate"]} />
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<ShieldAlert className="h-4 w-4 text-amber-600" />
							Control Plane
						</CardTitle>
						<CardDescription>Change implementations, toggle optional stages, validate, then apply only if the update is safe.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Query Transformer</span>
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									value={draft?.rag?.query_transformer ?? "identity"}
									onChange={(event) =>
										updateDraft({
											rag: { query_transformer: event.target.value } as WorkspaceRagConfigUpdate["rag"]
										})
									}
								>
									{available.query_transformer.map((value) => (
										<option key={value} value={value}>
											{value}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Embedder</span>
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									value={draft?.embedding?.component ?? "dense"}
									onChange={(event) =>
										updateDraft({
											embedding: { component: event.target.value } as WorkspaceRagConfigUpdate["embedding"]
										})
									}
								>
									{available.embedder.map((value) => (
										<option key={value} value={value}>
											{value}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Vector Store</span>
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									value={draft?.vectorstore?.component ?? "pgvector"}
									onChange={(event) =>
										updateDraft({
											vectorstore: { component: event.target.value } as WorkspaceRagConfigUpdate["vectorstore"]
										})
									}
								>
									{available.vectorstore.map((value) => (
										<option key={value} value={value}>
											{value}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Retriever</span>
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									value={draft?.retriever?.component ?? "vector"}
									onChange={(event) =>
										updateDraft({
											retriever: { component: event.target.value } as WorkspaceRagConfigUpdate["retriever"]
										})
									}
								>
									{available.retriever.map((value) => (
										<option key={value} value={value}>
											{value}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Reranker</span>
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									value={draft?.reranker?.component ?? "none"}
									onChange={(event) =>
										updateDraft({
											reranker: { component: event.target.value } as WorkspaceRagConfigUpdate["reranker"]
										})
									}
								>
									{available.reranker.map((value) => (
										<option key={value} value={value}>
											{value}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								<span>Vector Dimension</span>
								<input
									className="h-11 rounded-xl border border-slate-200 bg-white px-3"
									disabled={!draft}
									min={1}
									type="number"
									value={draft?.vectorstore?.vector_dimension ?? draft?.embedding?.dimension ?? 0}
									onChange={(event) =>
										updateDraft({
											vectorstore: {
												...draft?.vectorstore,
												vector_dimension: Number(event.target.value) || null
											}
										})
									}
								/>
							</label>
						</div>

						<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
							<Badge variant={activeAudit?.valid ? "secondary" : "danger"}>
								{activeAudit?.valid ? "SAFE TO APPLY" : "VALIDATION REQUIRED"}
							</Badge>
							<span className="text-sm text-slate-600">
								{compatibilityErrors.length === 0
									? "All pipeline compatibility checks are currently passing."
									: compatibilityErrors.map((check) => check.message).join(" | ")}
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<Button disabled={!draft || validateMutation.isPending} onClick={handleValidate} type="button" variant="secondary">
								{validateMutation.isPending ? "Validating..." : "Validate Changes"}
							</Button>
							<Button
								disabled={!draft || saveMutation.isPending || preview?.valid === false}
								onClick={handleApply}
								type="button"
							>
								{saveMutation.isPending ? "Applying..." : "Apply Safe Update"}
							</Button>
							{saveMutation.isSuccess ? (
								<span className="inline-flex items-center gap-2 text-sm text-orange-600">
									<CheckCircle2 className="h-4 w-4" />
									Pipeline updated.
								</span>
							) : null}
						</div>
					</CardContent>
				</Card>
			</div>
		</WorkspaceGuard>
	);
}
