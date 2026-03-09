"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Search,
	Cpu,
	Globe,
	Database,
	Layers,
	Zap,
	CheckCircle2,
	Box,
	Filter,
	ExternalLink,
	ChevronRight,
	Sparkles,
	Info,
	Download,
	RefreshCw,
	Rocket,
	LayoutGrid,
	ListFilter,
	Check
} from "lucide-react";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { useRuntimeModels } from "@/hooks/useRuntimeModels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelectDropdown } from "@/components/inputs/select-dropdown";

const RECOMMENDED_MODELS = [
	{ name: "meta-llama/Llama-2-7b-chat-hf", provider: "hf", type: "llm", framework: "vllm" },
	{ name: "mistralai/Mistral-7B-Instruct-v0.2", provider: "hf", type: "llm", framework: "vllm" },
	{ name: "BAAI/bge-small-en-v1.5", provider: "hf", type: "embedding", framework: "vllm" },
	{ name: "nomic-ai/nomic-embed-text-v1.5", provider: "hf", type: "embedding", framework: "vllm" },
	{ name: "gpt-4o", provider: "openai", type: "llm", framework: "openai" },
	{ name: "claude-3-5-sonnet-20240620", provider: "anthropic", type: "llm", framework: "anthropic" },
];

export default function WorkspaceModelsPage() {
	const { tenant } = useTenant();
	const runtime = useRuntimeModels();
	const queryClient = useQueryClient();

	// Advanced Filter State
	const [search, setSearch] = useState("");
	const [activeType, setActiveType] = useState<string>("all");
	const [activeTab, setActiveTab] = useState<string>("discover");
	const [activeProvider, setActiveProvider] = useState<string>("all");

	const [installing, setInstalling] = useState<Record<string, boolean>>({});

	const { data: registeredModels } = useQuery({
		queryKey: ["models", tenant.organizationId],
		queryFn: () => platformApi.listModels(tenant),
		enabled: Boolean(tenant.organizationId)
	});

	const installModelMutation = useMutation({
		mutationFn: (args: { name: string; type: string; framework: string }) =>
			platformApi.installModel(tenant, tenant.workspaceId!, args),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["models"] });
			queryClient.invalidateQueries({ queryKey: ["runtime-models"] });
		}
	});

	const handleInstall = async (model: any) => {
		setInstalling(prev => ({ ...prev, [model.name]: true }));
		try {
			await installModelMutation.mutateAsync({
				name: model.name,
				type: model.type,
				framework: model.framework || model.provider
			});
		} catch (err) {
			console.error("Installation failed", err);
		} finally {
			setTimeout(() => {
				setInstalling(prev => ({ ...prev, [model.name]: false }));
			}, 2000);
		}
	};

	const allModels = useMemo(() => {
		const list: Array<{ provider: string; name: string; isRegistered: boolean; type: string; framework?: string }> = [];

		// Add runtime models
		if (runtime.data) {
			for (const entry of runtime.data) {
				for (const model of entry.models) {
					list.push({
						provider: entry.provider,
						name: model,
						isRegistered: registeredModels?.some(m => m.name === model) ?? false,
						type: entry.kind
					});
				}
			}
		}

		// Add recommended if not already present
		RECOMMENDED_MODELS.forEach(m => {
			if (!list.some(l => l.name === m.name)) {
				list.push({ ...m, isRegistered: registeredModels?.some(rm => rm.name === m.name) ?? false });
			}
		});

		return list;
	}, [runtime.data, registeredModels]);

	const filteredModels = useMemo(() => {
		return allModels.filter((m) => {
			const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
				m.provider.toLowerCase().includes(search.toLowerCase());

			const matchesType = activeType === "all" || m.type === activeType;
			const matchesProvider = activeProvider === "all" || m.provider === activeProvider;
			const matchesStatus = activeTab === "discover" || (activeTab === "installed" && m.isRegistered);

			return matchesSearch && matchesType && matchesProvider && matchesStatus;
		});
	}, [allModels, search, activeType, activeProvider, activeTab]);

	const providers = useMemo(() => {
		const p = new Set<string>();
		allModels.forEach(m => p.add(m.provider));
		return Array.from(p).sort();
	}, [allModels]);

	const providerOptions = useMemo(() => {
		return [
			{ label: "All Providers", value: "all" },
			...providers.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))
		];
	}, [providers]);

	const stats = useMemo(() => {
		return {
			total: allModels.length,
			llm: allModels.filter(m => m.type === "llm").length,
			embedding: allModels.filter(m => m.type === "embedding").length,
			providers: providers.length
		};
	}, [allModels, providers]);

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<PageHeader
						eyebrow="Model Intelligence"
						title="Model Registry"
						description="Explore and manage LLM and Embedding models available in your workspace. Powered by LiteLLM and vLLM."
					/>
					<div className="flex items-center gap-3">
						<Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 py-1 px-3">
							<Zap className="w-3 h-3 mr-1" /> LiteLLM Active
						</Badge>
						<Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1 px-3">
							<Box className="w-3 h-3 mr-1" /> vLLM Ready
						</Badge>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
								<Globe className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-white">{stats.total}</div>
								<div className="text-xs text-slate-400">Total Models</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
								<Cpu className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-white">{stats.llm}</div>
								<div className="text-xs text-slate-400">LLM Engines</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
								<Layers className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-white">{stats.embedding}</div>
								<div className="text-xs text-slate-400">Embedders</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
								<Database className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-white">{stats.providers}</div>
								<div className="text-xs text-slate-400">Providers</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-4 bg-[#1c1c21] p-6 rounded-2xl border border-slate-800/60 shadow-xl">
						{/* Primary Tabs */}
						<div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-800/50 pb-6">
							<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
								<TabsList className="bg-[#121217] border-slate-800 p-1">
									<TabsTrigger value="discover" className="gap-2 data-[state=active]:bg-slate-800">
										<Sparkles className="w-4 h-4" /> Discover
									</TabsTrigger>
									<TabsTrigger value="installed" className="gap-2 data-[state=active]:bg-slate-800">
										<CheckCircle2 className="w-4 h-4" /> Installed Models
									</TabsTrigger>
								</TabsList>
							</Tabs>

							<div className="relative w-full sm:w-80">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
								<Input
									placeholder="Search model name, provider..."
									className="pl-9 bg-[#121217] border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500/40 h-11"
									value={search}
									onChange={e => setSearch(e.target.value)}
								/>
							</div>
						</div>

						{/* Secondary Filters */}
						<div className="flex flex-wrap gap-4 items-center pt-2">
							<div className="flex items-center gap-3 bg-[#121217] p-1 rounded-lg border border-slate-800">
								<Button
									variant="ghost"
									size="sm"
									className={cn("text-xs px-4 h-8", activeType === "all" ? "bg-slate-800 text-white" : "text-slate-500")}
									onClick={() => setActiveType("all")}
								>
									All Types
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className={cn("text-xs px-4 h-8", activeType === "llm" ? "bg-slate-800 text-white" : "text-slate-500")}
									onClick={() => setActiveType("llm")}
								>
									LLMs
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className={cn("text-xs px-4 h-8", activeType === "embedding" ? "bg-slate-800 text-white" : "text-slate-500")}
									onClick={() => setActiveType("embedding")}
								>
									Embeddings
								</Button>
							</div>

							<div className="h-4 w-px bg-slate-800 mx-2 hidden md:block" />

							<div className="flex items-center gap-2">
								<ListFilter className="w-4 h-4 text-slate-500" />
								<SelectDropdown
									label=""
									options={providerOptions}
									value={activeProvider}
									onChange={(e) => setActiveProvider(e.target.value)}
									className="w-48 bg-[#121217] border-slate-800 text-slate-300 h-9"
								/>
							</div>

							<div className="ml-auto text-xs text-slate-500 font-medium">
								Showing <span className="text-white font-bold">{filteredModels.length}</span> models
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredModels.length > 0 ? (
							filteredModels.map((model) => (
								<Card key={model.name} className="group overflow-hidden bg-[#1c1c21] border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/40">
									<div className={cn(
										"h-1.5 w-full",
										model.provider === "openai" ? "bg-emerald-500" :
											model.provider === "anthropic" ? "bg-amber-500" :
												model.provider === "ollama" ? "bg-blue-500" :
													model.provider === "vllm" || model.provider === "hf" ? "bg-purple-500" :
														"bg-slate-500"
									)} />
									<CardHeader className="pb-3">
										<div className="flex justify-between items-start">
											<div className="flex flex-col gap-1">
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold uppercase tracking-widest text-slate-500">{model.provider}</span>
													{model.isRegistered && (
														<Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-0 h-4 text-[10px] px-1.5 font-bold tracking-tight">INSTALLED</Badge>
													)}
												</div>
												<CardTitle className="text-lg text-white font-semibold truncate group-hover:text-blue-400 transition-colors" title={model.name}>
													{model.name}
												</CardTitle>
											</div>
										</div>
									</CardHeader>
									<CardContent className="pb-4">
										<div className="flex flex-col gap-4">
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="rounded-md border-slate-800 bg-slate-900/50 text-slate-400 text-[10px] font-medium py-0">
													{model.type.toUpperCase()}
												</Badge>
												{(model.provider === "hf" || model.framework === "vllm") && (
													<Badge variant="outline" className="rounded-md border-purple-500/20 bg-purple-500/5 text-purple-400 text-[10px] font-medium py-0">
														vLLM ENGINE
													</Badge>
												)}
											</div>

											<div className="mt-2 flex items-center justify-between">
												<div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
													<div className={cn("h-1.5 w-1.5 rounded-full", model.isRegistered ? "bg-emerald-500" : "bg-slate-600")} />
													{model.isRegistered ? "ACTIVE" : "AVAILABLE"}
												</div>
												{model.isRegistered ? (
													<div className="flex items-center gap-2">
														<Button variant="ghost" size="sm" className="h-8 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 gap-1.5">
															<CheckCircle2 className="w-3 h-3" /> Ready
														</Button>
													</div>
												) : (
													<Button
														variant="secondary"
														size="sm"
														className="h-8 text-[11px] font-bold gap-1.5 active:scale-95 bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
														onClick={() => handleInstall(model)}
														disabled={installing[model.name]}
													>
														{installing[model.name] ? (
															<>
																<RefreshCw className="w-3 h-3 animate-spin" /> Installing
															</>
														) : (
															<>
																<Download className="w-3 h-3" /> Install
															</>
														)}
													</Button>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							))
						) : (
							<div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-[#1c1c21] rounded-2xl border border-dashed border-slate-800">
								<div className="p-4 rounded-full bg-slate-900 shadow-inner">
									<Search className="w-10 h-10 text-slate-700" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-white">No models match criteria</h3>
									<p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
										Try adjusting your search, type, or provider filters.
									</p>
								</div>
								<Button variant="outline" className="mt-2 border-slate-700 hover:bg-slate-800 text-slate-300" onClick={() => { setSearch(""); setActiveType("all"); setActiveProvider("all"); setActiveTab("discover"); }}>
									Clear all filters
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Help section */}
				<section className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/10 flex flex-col md:flex-row items-center gap-6">
					<div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
						<Info className="w-8 h-8" />
					</div>
					<div className="flex-1">
						<h4 className="text-white font-semibold">Hierarchy-Aware Filtering</h4>
						<p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
							Filters apply globally across the <span className="text-blue-400">Model Registry</span>. Use the <span className="text-emerald-400">Installed</span> tab to see models that have already been provisioned for the current workspace. Models can be filtered by their specific training objective (LLM vs Embedding) and providing infrastructure.
						</p>
					</div>
					<Button className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shrink-0">
						Check GPU Status <Rocket className="w-3 h-3 ml-2" />
					</Button>
				</section>
			</div>
		</WorkspaceGuard>
	);
}

// Missing icon used above
function MessageSquareText(props: any) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			<path d="M8 9h8" />
			<path d="M8 13h6" />
		</svg>
	);
}
