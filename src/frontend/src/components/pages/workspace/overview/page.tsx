"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
	MessageSquare,
	Files,
	Database,
	Activity,
	ArrowRight,
	Settings,
	Shield,
	Zap
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function WorkspaceOverviewPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;

	const { data: observability } = useQuery({
		queryKey: ["workspace-overview", "observability", workspaceId],
		queryFn: platformApi.observabilitySummary,
	});

	const { data: datasets } = useQuery({
		queryKey: ["workspace-overview", "datasets", workspaceId],
		queryFn: () => platformApi.listKnowledgeDatasets(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const { data: documents } = useQuery({
		queryKey: ["workspace-overview", "documents", workspaceId],
		queryFn: () => platformApi.listRuntimeDocuments(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const stats = [
		{
			title: "Knowledge Base",
			value: datasets?.length ?? 0,
			description: "Active datasets",
			icon: Database,
			color: "text-blue-600",
			bg: "bg-blue-50"
		},
		{
			title: "Documents",
			value: documents?.length ?? 0,
			description: "Indexed files",
			icon: Files,
			color: "text-emerald-600",
			bg: "bg-emerald-50"
		},
		{
			title: "Chat Sessions",
			value: observability?.events?.length ?? 0,
			description: "Last 30 days",
			icon: MessageSquare,
			color: "text-purple-600",
			bg: "bg-purple-50"
		},
		{
			title: "Latency",
			value: "240ms",
			description: "Avg response time",
			icon: Zap,
			color: "text-amber-600",
			bg: "bg-amber-50"
		}
	];

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Workspace Dashboard</h1>
					<p className="text-slate-500 max-w-2xl text-lg">
						Welcome to <span className="font-semibold text-slate-900">{workspaceId}</span>. manage your RAG pipelines, monitor performance, and interact with your AI agents.
					</p>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{stats.map((stat) => (
						<Card key={stat.title} className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div className={cn("p-3 rounded-xl", stat.bg)}>
										<stat.icon className={cn("h-6 w-6", stat.color)} />
									</div>
									<div className="flex flex-col">
										<span className="text-sm font-medium text-slate-500">{stat.title}</span>
										<span className="text-2xl font-bold text-slate-950">{stat.value}</span>
									</div>
								</div>
								<div className="mt-4 text-xs text-slate-400 font-medium flex items-center gap-1">
									<Activity className="h-3 w-3" />
									{stat.description}
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content Areas */}
					<div className="lg:col-span-2 flex flex-col gap-8">
						<Card className="border-slate-200/60 shadow-md">
							<CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
								<div className="space-y-1">
									<CardTitle className="text-xl">Active Datasets</CardTitle>
									<CardDescription>Knowledge bases powering your RAG system</CardDescription>
								</div>
								<Link
									href={generateWorkspaceUrl(workspaceId, "rag")}
									className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
								>
									Manage all <ArrowRight className="h-4 w-4" />
								</Link>
							</CardHeader>
							<CardContent className="p-0">
								{datasets?.length ? (
									<div className="divide-y divide-slate-50">
										{datasets.slice(0, 5).map((dataset) => (
											<div key={dataset.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
												<div className="flex items-center gap-4">
													<div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
														<Database className="h-5 w-5 text-blue-600" />
													</div>
													<div>
														<div className="font-semibold text-slate-900">{dataset.name}</div>
														<div className="text-xs text-slate-500 font-medium mt-0.5">Model: {dataset.embedding_model}</div>
													</div>
												</div>
												<div className="flex items-center gap-3">
													<span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">Synchronized</span>
													<button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
														<Settings className="h-4 w-4" />
													</button>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="p-12 text-center flex flex-col items-center gap-3">
										<Database className="h-12 w-12 text-slate-200" />
										<p className="text-slate-500 font-medium">No datasets found in this workspace.</p>
										<Link
											href={generateWorkspaceUrl(workspaceId, "rag")}
											className="mt-2 text-sm font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
										>
											Connect your first dataset
										</Link>
									</div>
								)}
							</CardContent>
						</Card>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Card className="border-slate-200/60 shadow-md hover:border-emerald-200 transition-colors group">
								<CardHeader>
									<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 group-hover:bg-emerald-100 transition-colors">
										<MessageSquare size={24} />
									</div>
									<CardTitle className="text-lg">AI Interface</CardTitle>
									<CardDescription>Interactive chat with your workspace knowledge</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={generateWorkspaceUrl(workspaceId, "chat")}
										className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
									>
										Open Chat <ArrowRight className="h-4 w-4" />
									</Link>
								</CardContent>
							</Card>

							<Card className="border-slate-200/60 shadow-md hover:border-purple-200 transition-colors group">
								<CardHeader>
									<div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2 group-hover:bg-purple-100 transition-colors">
										<Zap size={24} />
									</div>
									<CardTitle className="text-lg">Playground</CardTitle>
									<CardDescription>Test prompts, models, and retrieval strategies</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={generateWorkspaceUrl(workspaceId, "playground")}
										className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
									>
										Launch Playground <Activity className="h-4 w-4" />
									</Link>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Sidebar Area */}
					<div className="flex flex-col gap-8">
						<Card className="border-slate-200/60 shadow-md bg-slate-900 text-white border-0 overflow-hidden relative">
							<div className="absolute top-0 right-0 p-8 opacity-10">
								<Zap size={120} />
							</div>
							<CardHeader>
								<CardTitle className="text-white flex items-center gap-2 italic tracking-tight">
									<Shield className="text-emerald-400 h-5 w-5" />
									Karag PRO
								</CardTitle>
								<CardDescription className="text-slate-400 leading-relaxed pt-2">
									Unlock advanced observability, multi-tenant RBAC, and high-availability vector stores.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<button className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors">
									Upgrade Plan
								</button>
							</CardContent>
						</Card>

						<Card className="border-slate-200/60 shadow-md">
							<CardHeader className="pb-4">
								<CardTitle className="text-lg">Workspace Health</CardTitle>
								<CardDescription>System status and connectivity</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-slate-600 font-medium">Vector DB</span>
									<span className="flex items-center gap-1.5 text-emerald-600 font-bold">
										<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
										Online
									</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-slate-600 font-medium">LLM Gateway</span>
									<span className="flex items-center gap-1.5 text-emerald-600 font-bold">
										<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
										Stable
									</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-slate-600 font-medium">Storage Service</span>
									<span className="flex items-center gap-1.5 text-emerald-600 font-bold">
										<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
										Ready
									</span>
								</div>
							</CardContent>
						</Card>

						<Card className="border-slate-200/60 shadow-md p-6">
							<div className="flex flex-col gap-4">
								<div className="font-bold text-slate-950">Quick Settings</div>
								<nav className="flex flex-col gap-1">
									<Link
										href={generateWorkspaceUrl(workspaceId, "settings")}
										className="p-2 -mx-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between group"
									>
										<span className="text-sm font-medium">Workspace Config</span>
										<ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
									<Link
										href={generateWorkspaceUrl(workspaceId, "api-keys")}
										className="p-2 -mx-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between group"
									>
										<span className="text-sm font-medium">Manage API Keys</span>
										<ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
									<Link
										href={generateWorkspaceUrl(workspaceId, "models")}
										className="p-2 -mx-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between group"
									>
										<span className="text-sm font-medium">Models Registry</span>
										<ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</nav>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</WorkspaceGuard>
	);
}
