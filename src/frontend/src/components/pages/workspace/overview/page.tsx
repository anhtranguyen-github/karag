"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Files, Activity, ArrowRight, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import PageShell from "@/components/ui/page-shell";
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

	const { data: documents } = useQuery({
		queryKey: ["workspace-overview", "documents", workspaceId],
		queryFn: () => platformApi.listRuntimeDocuments(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const stats = [
		{ title: "Documents", value: documents?.length ?? 0, description: "Indexed files", icon: Files, color: "text-orange-500", bg: "bg-emerald-50" },
		{ title: "Chat Sessions", value: observability?.events?.length ?? 0, description: "Last 30 days", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
		{ title: "Latency", value: "240ms", description: "Avg response time", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
	];

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
				<PageShell title="Workspace Dashboard" scopeLabel="Workspace" subtitle={`Managed by you.`}>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{stats.map((stat) => {
							const Icon = stat.icon;
							return (
								<Card key={stat.title} className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
									<CardContent className="p-6">
										<div className="flex items-center gap-4">
											<div className={cn("p-3 rounded-xl", stat.bg)}>
												<Icon className={cn("h-6 w-6", stat.color)} />
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
							);
						})}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2 flex flex-col gap-8">
							<Card className="border-slate-200/60 shadow-md">
								<CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
									<div className="space-y-1">
										<CardTitle className="text-xl">Documents</CardTitle>
										<CardDescription>Files indexed in your RAG system</CardDescription>
									</div>
									<Link href={generateWorkspaceUrl(workspaceId, "context-docs")} className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
										Manage all <ArrowRight className="h-4 w-4" />
									</Link>
								</CardHeader>
								<CardContent className="p-6">
									<p className="text-sm text-slate-500">{documents?.length ?? 0} documents indexed in this workspace.</p>
								</CardContent>
							</Card>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Card className="border-slate-200/60 shadow-md hover:border-emerald-200 transition-colors group">
									<CardHeader>
										<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-orange-500 mb-2 group-hover:bg-emerald-100 transition-colors">
											<MessageSquare size={24} />
										</div>
										<CardTitle className="text-lg">AI Interface</CardTitle>
										<CardDescription>Interactive chat with your workspace knowledge</CardDescription>
									</CardHeader>
									<CardContent>
										<Link href={generateWorkspaceUrl(workspaceId, "chat")} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-[#e5e5e5] rounded-lg font-bold hover:bg-orange-600 shadow-lg shadow-orange-400/20 transition-all active:scale-[0.98]">
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
										<Link href={generateWorkspaceUrl(workspaceId, "playground")} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-[#e5e5e5] rounded-lg font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]">
											Launch Playground <Activity className="h-4 w-4" />
										</Link>
									</CardContent>
								</Card>
							</div>
						</div>

						<div className="flex flex-col gap-8">
							<Card className="border-slate-200/60 shadow-md">
								<CardHeader className="pb-4">
									<CardTitle className="text-lg flex items-center gap-2"><Shield className="text-indigo-400 h-5 w-5" />Karag</CardTitle>
									<CardDescription className="text-slate-400 leading-relaxed pt-2">This instance is managed by you. All features are available.</CardDescription>
								</CardHeader>
							</Card>

							<Card className="border-slate-200/60 shadow-md">
								<CardHeader className="pb-4">
									<CardTitle className="text-lg">Workspace Health</CardTitle>
									<CardDescription>System status and connectivity</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-600 font-medium">Vector DB</span>
										<span className="flex items-center gap-1.5 text-orange-500 font-bold"><div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />Online</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-600 font-medium">LLM Gateway</span>
										<span className="flex items-center gap-1.5 text-orange-500 font-bold"><div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />Stable</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-600 font-medium">Storage Service</span>
										<span className="flex items-center gap-1.5 text-orange-500 font-bold"><div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />Ready</span>
									</div>
								</CardContent>
							</Card>

							<Card className="border-slate-200/60 shadow-md p-6">
								<div className="flex flex-col gap-4">
									<div className="font-bold text-slate-950">Quick Settings</div>
									<nav className="flex flex-col gap-1">
										<Link href={generateWorkspaceUrl(workspaceId, "settings")} className="p-2 -mx-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between group"><span className="text-sm font-medium">Workspace Config</span><ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></Link>
										<Link href={generateWorkspaceUrl(workspaceId, "api-keys")} className="p-2 -mx-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between group"><span className="text-sm font-medium">Manage API Keys</span><ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></Link>
									</nav>
								</div>
							</Card>
						</div>
					</div>

				</PageShell>
			</div>
		</WorkspaceGuard>
	);
}

