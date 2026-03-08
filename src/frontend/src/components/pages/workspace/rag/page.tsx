"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Database,
	Plus,
	Trash2,
	Settings,
	FileText,
	Search,
	CheckCircle2,
	Clock,
	AlertCircle,
	MoreVertical,
	ChevronRight,
	PlusCircle,
	Layers,
	Cpu
} from "lucide-react";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

export default function WorkspaceRagSettingsPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;
	const queryClient = useQueryClient();

	const [isCreating, setIsCreating] = useState(false);
	const [newDataset, setNewDataset] = useState({
		name: "",
		id: "",
		embedding_model: "nomic-embed-text",
		chunk_strategy: "recursive"
	});

	const { data: datasets, isLoading } = useQuery({
		queryKey: ["workspace-rag", "datasets", workspaceId],
		queryFn: () => platformApi.listKnowledgeDatasets(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const createMutation = useMutation({
		mutationFn: (body: any) => platformApi.createKnowledgeDataset(tenant, { ...body, workspace_id: workspaceId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-rag", "datasets", workspaceId] });
			setIsCreating(false);
			setNewDataset({ name: "", id: "", embedding_model: "nomic-embed-text", chunk_strategy: "recursive" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => platformApi.deleteKnowledgeDataset(tenant, id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-rag", "datasets", workspaceId] });
		},
	});

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate(newDataset);
	};

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">RAG Pipelines</h1>
						<p className="text-slate-500">
							Connect and configure your knowledge bases for grounding AI responses.
						</p>
					</div>
					<Button
						onClick={() => setIsCreating(true)}
						className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 px-6 py-6 rounded-xl font-bold text-base transition-all active:scale-[0.98] gap-2"
					>
						<PlusCircle size={22} />
						New Dataset
					</Button>
				</div>

				{isCreating && (
					<Card className="border-emerald-200 bg-emerald-50/20 shadow-xl animate-in slide-in-from-top-4 duration-300 overflow-hidden border-2">
						<CardHeader className="bg-white border-b border-emerald-100">
							<CardTitle>Create Knowledge Dataset</CardTitle>
							<CardDescription>Configure your embedding model and chunking strategy.</CardDescription>
						</CardHeader>
						<form onSubmit={handleCreate}>
							<CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-slate-700 font-bold">Dataset Name</Label>
										<Input
											placeholder="e.g. Sales Documentation"
											value={newDataset.name}
											onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
											required
											className="rounded-xl border-slate-200 focus:border-emerald-500 bg-slate-50/50"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-slate-700 font-bold">Dataset ID</Label>
										<Input
											placeholder="e.g. sales-docs"
											value={newDataset.id}
											onChange={(e) => setNewDataset({ ...newDataset, id: e.target.value })}
											required
											className="rounded-xl border-slate-200 focus:border-emerald-500 bg-slate-50/50"
										/>
									</div>
								</div>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-slate-700 font-bold">Embedding Model</Label>
										<select
											className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 focus:outline-none text-sm font-medium"
											value={newDataset.embedding_model}
											onChange={(e) => setNewDataset({ ...newDataset, embedding_model: e.target.value })}
										>
											<option value="nomic-embed-text">nomic-embed-text (Ollama)</option>
											<option value="text-embedding-3-small">text-embedding-3-small (OpenAI)</option>
											<option value="text-embedding-3-large">text-embedding-3-large (OpenAI)</option>
										</select>
									</div>
									<div className="space-y-2">
										<Label className="text-slate-700 font-bold">Chunking Strategy</Label>
										<select
											className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 focus:outline-none text-sm font-medium"
											value={newDataset.chunk_strategy}
											onChange={(e) => setNewDataset({ ...newDataset, chunk_strategy: e.target.value })}
										>
											<option value="recursive">Recursive Character (Recommended)</option>
											<option value="fixed">Fixed Size</option>
											<option value="markdown">Markdown Header Aware</option>
										</select>
									</div>
								</div>
							</CardContent>
							<div className="p-6 bg-slate-50/50 flex justify-end gap-3 border-t">
								<Button variant="ghost" type="button" onClick={() => setIsCreating(false)} className="rounded-xl font-bold">Cancel</Button>
								<Button
									type="submit"
									disabled={createMutation.isPending}
									className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-emerald-500/20"
								>
									{createMutation.isPending ? "Creating..." : "Create Dataset"}
								</Button>
							</div>
						</form>
					</Card>
				)}

				<div className="grid grid-cols-1 gap-6">
					{isLoading ? (
						<div className="p-12 flex justify-center items-center">
							<Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
						</div>
					) : datasets?.length ? (
						datasets.map((dataset) => (
							<Card key={dataset.id} className="border-slate-200/60 shadow-md hover:border-slate-300 transition-all group overflow-hidden">
								<div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
									<div className="p-6 md:w-1/3 bg-slate-50/30 group-hover:bg-slate-50/60 transition-colors">
										<div className="flex items-center gap-4 mb-4">
											<div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
												<Database size={24} />
											</div>
											<div className="flex flex-col">
												<h3 className="font-bold text-slate-950 text-xl leading-tight">{dataset.name}</h3>
												<span className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{dataset.id}</span>
											</div>
										</div>
										<div className="flex items-center gap-2 mb-1 text-emerald-600">
											<CheckCircle2 size={16} />
											<span className="text-sm font-bold">Dataset Active</span>
										</div>
										<p className="text-sm text-slate-500 font-medium">Monitoring {workspaceId} knowledge flow in real-time.</p>
									</div>

									<div className="p-6 md:flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
										<div className="space-y-4">
											<div className="flex flex-col gap-1.5">
												<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
													<Cpu size={12} />
													Embedding Pipeline
												</span>
												<div className="p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold text-slate-700 shadow-sm">
													{dataset.embedding_model}
												</div>
											</div>
											<div className="flex flex-col gap-1.5">
												<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
													<Layers size={12} />
													Chunking Strategy
												</span>
												<div className="p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold text-slate-700 shadow-sm">
													{dataset.chunk_strategy}
												</div>
											</div>
										</div>

										<div className="flex flex-col justify-between">
											<div className="space-y-3">
												<div className="flex items-center justify-between text-sm">
													<span className="text-slate-500 font-medium">Total Documents</span>
													<span className="font-bold text-slate-900">0 Items</span>
												</div>
												<div className="flex items-center justify-between text-sm">
													<span className="text-slate-500 font-medium">Vector Count</span>
													<span className="font-bold text-slate-900">0 Nodes</span>
												</div>
												<div className="flex items-center justify-between text-sm">
													<span className="text-slate-500 font-medium">Memory Usage</span>
													<span className="font-bold text-slate-900">0 MB</span>
												</div>
											</div>

											<div className="flex items-center gap-2 pt-6">
												<Button
													className="flex-1 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 shadow-lg shadow-slate-950/10 gap-2 h-11"
												>
													<FileText size={18} />
													View Data
												</Button>
												<Button
													variant="outline"
													onClick={() => deleteMutation.mutate(dataset.id)}
													disabled={deleteMutation.isPending}
													className="rounded-xl border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all font-bold group h-11 px-3"
												>
													<Trash2 size={18} />
												</Button>
											</div>
										</div>
									</div>
								</div>
							</Card>
						))
					) : (
						<div className="p-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 animate-in fade-in duration-1000">
							<div className="h-24 w-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6 drop-shadow-sm">
								<Database size={48} />
							</div>
							<h3 className="text-2xl font-bold text-slate-900 mb-2">No datasets configured</h3>
							<p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
								Datasets are the core of your knowledge base. Connect a data source to begin building your retrieval system.
							</p>
							<Button
								onClick={() => setIsCreating(true)}
								className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 text-lg active:scale-95 transition-all"
							>
								Initialize Knowledge Base
							</Button>
						</div>
					)}
				</div>
			</div>
		</WorkspaceGuard>
	);
}

function Loader2({ size, className }: { size?: number, className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size || 24}
			height={size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M12 2v4" />
			<path d="m16.2 4.2 2.8 2.8" />
			<path d="M18 12h4" />
			<path d="m16.2 19.8 2.8-2.8" />
			<path d="M12 18v4" />
			<path d="m4.2 19.8 2.8-2.8" />
			<path d="M2 12h4" />
			<path d="m4.2 4.2 2.8 2.8" />
		</svg>
	)
}
