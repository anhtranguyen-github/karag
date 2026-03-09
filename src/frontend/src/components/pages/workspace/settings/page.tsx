"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Settings,
	Trash2,
	Save,
	AlertTriangle,
	Info,
	Sliders,
	Database,
	Cpu,
	ShieldAlert
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
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

	const { data: providers } = useQuery({
		queryKey: ["providers"],
		queryFn: () => platformApi.listProviders(),
		staleTime: 1000 * 60 * 5,
	});

	const [selectedLlmProvider, setSelectedLlmProvider] = useState<string | undefined>(() => ragConfig?.llm_config?.provider ?? undefined);
	const [selectedLlmModel, setSelectedLlmModel] = useState<string | undefined>(() => ragConfig?.llm_config?.model ?? undefined);
	const [selectedVectorStore, setSelectedVectorStore] = useState<string | undefined>(() => ragConfig?.vector_store_type ?? undefined);
	const [collectionName, setCollectionName] = useState<string | undefined>(() => ragConfig?.vector_store_config?.collection_name ?? undefined);

	useEffect(() => {
		if (ragConfig) {
			setSelectedLlmProvider(ragConfig.llm_config?.provider ?? undefined);
			setSelectedLlmModel(ragConfig.llm_config?.model ?? undefined);
			setSelectedVectorStore(ragConfig.vector_store_type ?? undefined);
			setCollectionName(ragConfig.vector_store_config?.collection_name ?? undefined);
		}
	}, [ragConfig]);

	const updateRagMutation = useMutation({
		mutationFn: (body: any) => platformApi.updateWorkspaceRagConfig(tenant, workspaceId, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-settings", "rag-config", workspaceId] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => platformApi.deleteWorkspace(tenant, workspaceId),
		onSuccess: () => {
			router.push(`/dashboard/project/${tenant.projectId}`);
		},
	});

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Workspace Settings</h1>
					<p className="text-slate-500">
						Configure system parameters, RAG defaults, and manage workspace lifecycle.
					</p>
				</div>

				{/* General Settings */}
				<Card className="border-slate-200 shadow-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Info size={18} className="text-blue-500" />
							General Information
						</CardTitle>
						<CardDescription>Basic settings for your workspace identification.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Workspace Name</Label>
							<Input defaultValue={workspaceId} className="rounded-xl bg-slate-50 border-slate-200" />
						</div>
						<div className="space-y-2">
							<Label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Description</Label>
							<Textarea
								placeholder="Briefly describe the purpose of this workspace..."
								className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px]"
							/>
						</div>
					</CardContent>
					<CardFooter className="bg-slate-50/50 justify-end rounded-b-xl border-t">
						<Button className="rounded-xl font-bold bg-slate-900 text-white gap-2">
							<Save size={16} />
							Save Changes
						</Button>
					</CardFooter>
				</Card>

				{/* vLLM Warmup */}
				<div className="mt-4 p-4 rounded-lg bg-[#0b1220] border border-slate-800">
					<div className="flex items-center gap-3">
						<Button
							onClick={async () => {
								try {
									const res = await platformApi.vllmHealth();
									alert("vLLM reachable: " + JSON.stringify(res));
								} catch (err: any) {
									alert("vLLM not reachable: " + (err?.message || String(err)));
								}
							}}
							className="rounded-lg bg-blue-600 text-white"
						>
							Warm vLLM
							</Button>
						<span className="text-sm text-slate-400">Probe and warm the configured vLLM endpoint.</span>
					</div>
				</div>

				{/* RAG Configuration */}
				<Card className="border-slate-200 shadow-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sliders size={18} className="text-emerald-500" />
							RAG Orchestration
						</CardTitle>
						<CardDescription>Default retrieval and generation parameters.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Default LLM Provider</Label>
									<select
										className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none text-sm font-medium"
										value={selectedLlmProvider}
										onChange={(e) => setSelectedLlmProvider(e.target.value)}
									>
										<option value="">Select provider</option>
										{providers?.llm_providers?.map((p) => (
											<option key={p} value={p}>{p}</option>
										))}
									</select>
								</div>
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Inference Model</Label>
									<input
										className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium"
										value={selectedLlmModel ?? ""}
										onChange={(e) => setSelectedLlmModel(e.target.value)}
										placeholder="model id e.g. meta-llama/Llama-2-7b-chat-hf"
									/>
								</div>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Retrieval Top-K</Label>
									<Input type="number" defaultValue={ragConfig?.retrieval_config.top_k ?? 3} className="rounded-xl bg-slate-50 border-slate-200" />
									<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Number of chunks context to retrieve</p>
								</div>
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Re-ranking Threshold</Label>
									<Input type="number" step="0.1" defaultValue="0.7" className="rounded-xl bg-slate-50 border-slate-200" />
								</div>
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Vector Store</Label>
									<select
										className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none text-sm font-medium"
										value={selectedVectorStore}
										onChange={(e) => setSelectedVectorStore(e.target.value)}
									>
										<option value="">Select vector store</option>
										{providers?.vector_stores?.map((v) => (
											<option key={v} value={v}>{v}</option>
										))}
									</select>
								</div>
								<div className="space-y-2">
									<Label className="font-bold text-slate-700">Collection Name</Label>
									<Input value={collectionName ?? ""} onChange={(e) => setCollectionName(e.target.value)} className="rounded-xl bg-slate-50 border-slate-200" />
									<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Optional collection name for vector store</p>
								</div>
							</div>
						</div>
					</CardContent>
					<CardFooter className="bg-slate-50/50 justify-end rounded-b-xl border-t">
						<Button
							className="rounded-xl font-bold bg-slate-900 text-white gap-2"
							onClick={() => {
								updateRagMutation.mutate({
									...ragConfig,
									llm_config: {
										provider: selectedLlmProvider || ragConfig?.llm_config?.provider,
										model: selectedLlmModel || ragConfig?.llm_config?.model,
										temperature: ragConfig?.llm_config?.temperature ?? 0.7,
										max_tokens: ragConfig?.llm_config?.max_tokens ?? 512,
										streaming: ragConfig?.llm_config?.streaming ?? false,
									},
									vector_store_type: selectedVectorStore || ragConfig?.vector_store_type,
									vector_store_config: {
										...ragConfig?.vector_store_config,
										collection_name: collectionName || ragConfig?.vector_store_config?.collection_name,
									},
								});
							}}
						>
							<Save size={16} />
							Update RAG Policy
						</Button>
					</CardFooter>
				</Card>

				{/* Danger Zone */}
				<Card className="border-rose-200 bg-rose-50/20 shadow-sm">
					<CardHeader>
						<CardTitle className="text-rose-600 flex items-center gap-2">
							<ShieldAlert size={18} />
							Danger Zone
						</CardTitle>
						<CardDescription className="text-rose-400">Irreversible actions that affect your data integrity.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="p-4 rounded-xl bg-white border border-rose-100 flex items-center justify-between">
							<div className="space-y-0.5">
								<div className="font-bold text-slate-900">Delete this workspace</div>
								<p className="text-xs text-slate-500 font-medium">Once deleted, all datasets and configurations are gone forever.</p>
							</div>
							<Button
								variant="ghost"
								onClick={() => {
									if (confirm("Are you sure you want to delete this workspace?")) {
										deleteMutation.mutate();
									}
								}}
								className="rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold border border-rose-100"
							>
								Delete Workspace
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</WorkspaceGuard>
	);
}
