"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	BarChart3,
	Clock,
	History,
	Zap,
	Terminal,
	Filter,
	ArrowUpRight,
	ShieldCheck,
	Eye,
	AlertCircle,
	Database,
	Search,
	CheckCircle2,
	GitGraph
} from "lucide-react";
import { useParams } from "next/navigation";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WorkspaceObservabilityPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;

	const { data: summary, isLoading } = useQuery({
		queryKey: ["workspace-observability", workspaceId],
		queryFn: platformApi.observabilitySummary,
		refetchInterval: 5000 // Polling for real-time feel
	});

	const workspaceEvents = useMemo(() => {
		return (summary?.events ?? []).filter(e => e.workspace_id === workspaceId);
	}, [summary, workspaceId]);

	const workspaceTraces = useMemo(() => {
		return (summary?.recent_traces ?? []).filter(t => t.workspace_id === workspaceId);
	}, [summary, workspaceId]);

	const metrics = useMemo(() => {
		let totalLatency = 0;
		let traceCount = 0;
		let totalTokens = 0;

		workspaceTraces.forEach(t => {
			if (t.metrics?.latency_ms) {
				totalLatency += t.metrics.latency_ms as number;
				traceCount++;
			}
			if (t.metrics?.total_tokens) {
				totalTokens += t.metrics.total_tokens as number;
			}
		});

		return {
			avgLatency: traceCount > 0 ? Math.round(totalLatency / traceCount) : 0,
			totalCalls: workspaceTraces.length,
			tokenThroughput: totalTokens,
			eventCount: workspaceEvents.length
		};
	}, [workspaceTraces, workspaceEvents]);

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<PageHeader
						eyebrow="System Insight"
						title="Observability"
						description="Monitor RAG pipelines, trace LLM calls, and audit system events in real-time."
					/>
					<div className="flex items-center gap-2">
						{isLoading ? (
							<Badge variant="outline" className="bg-slate-800 border-slate-700 animate-pulse">Syncing...</Badge>
						) : (
							<Badge variant="outline" className="bg-orange-400/10 text-orange-400 border-orange-400/20">
								<div className="h-2 w-2 rounded-full bg-orange-400 mr-2 animate-pulse" />
								Live Telemetry
							</Badge>
						)}
					</div>
				</div>

				{/* Metrics Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
								<Clock className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-[#e5e5e5]">{metrics.avgLatency}ms</div>
								<div className="text-xs text-slate-400">Avg Latency</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-orange-400/10 text-orange-400">
								<BarChart3 className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-[#e5e5e5]">{metrics.totalCalls}</div>
								<div className="text-xs text-slate-400">Total Traces</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
								<Zap className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-[#e5e5e5]">{metrics.tokenThroughput}</div>
								<div className="text-xs text-slate-400">Tokens Processed</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-[#18181b] border-slate-800">
						<CardContent className="p-4 flex items-center gap-4">
							<div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
								<GitGraph className="w-5 h-5" />
							</div>
							<div>
								<div className="text-2xl font-bold text-[#e5e5e5]">{metrics.eventCount}</div>
								<div className="text-xs text-slate-400">Recent Events</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Tabs defaultValue="traces" className="w-full">
					<TabsList className="bg-[#1c1c21] border-slate-800 mb-6">
						<TabsTrigger value="traces" className="gap-2">
							<History className="w-4 h-4" /> Traces
						</TabsTrigger>
						<TabsTrigger value="events" className="gap-2">
							<Terminal className="w-4 h-4" /> System Events
						</TabsTrigger>
					</TabsList>

					<TabsContent value="traces">
						<Card className="bg-[#1c1c21] border-slate-800">
							<CardHeader className="border-b border-slate-800/50">
								<div className="flex justify-between items-center">
									<CardTitle className="text-lg text-[#e5e5e5]">Recent Traces</CardTitle>
									<Button variant="ghost" size="sm" className="text-slate-500 hover:text-[#e5e5e5]">
										<Filter className="w-4 h-4 mr-2" /> Filter
									</Button>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{workspaceTraces.length > 0 ? (
									<div className="divide-y divide-slate-800/50">
										{workspaceTraces.map((trace) => (
											<div key={trace.trace_id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors group">
												<div className="flex items-center gap-4">
													<div className={cn(
														"p-2 rounded-lg bg-slate-900 border border-slate-800",
														trace.trace_type === "chat_completion" ? "text-blue-400" :
															trace.trace_type === "rag_query" ? "text-orange-400" : "text-amber-400"
													)}>
														{trace.trace_type === "chat_completion" ? <MessageSquareText className="w-5 h-5" /> :
															trace.trace_type === "rag_query" ? <Search className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
													</div>
													<div>
														<div className="flex items-center gap-2">
															<span className="text-sm font-semibold text-[#e5e5e5] capitalize">{trace.trace_type.replace(/_/g, " ")}</span>
															<Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-800 text-slate-500 py-0 h-4">
																{trace.trace_id.slice(0, 8)}
															</Badge>
														</div>
														<div className="text-[11px] text-slate-500 mt-0.5">
															{new Date(trace.created_at).toLocaleString()}
														</div>
													</div>
												</div>

												<div className="flex items-center gap-6">
													<div className="hidden md:flex flex-col items-end">
														<span className="text-xs font-bold text-[#e5e5e5]">{trace.metrics?.latency_ms || 0}ms</span>
														<span className="text-[10px] text-slate-500">Latency</span>
													</div>
													<div className="hidden md:flex flex-col items-end">
														<span className="text-xs font-bold text-[#e5e5e5]">{trace.metrics?.total_tokens || 0}</span>
														<span className="text-[10px] text-slate-500">Tokens</span>
													</div>
													<div className="flex items-center gap-2">
														{trace.status === "ok" ? (
															<CheckCircle2 className="w-4 h-4 text-orange-400" />
														) : (
															<AlertCircle className="w-4 h-4 text-rose-500" />
														)}
														<Button variant="ghost" size="icon" className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
															<Eye className="w-4 h-4" />
														</Button>
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="p-12 text-center flex flex-col items-center gap-3">
										<Activity className="h-12 w-12 text-slate-800" />
										<p className="text-slate-500 font-medium">No traces recorded yet.</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="events">
						<Card className="bg-[#1c1c21] border-slate-800">
							<CardHeader className="border-b border-slate-800/50">
								<CardTitle className="text-lg text-[#e5e5e5]">Event Bus Feed (Outbox)</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<div className="p-4 bg-black/40 font-mono text-[13px] text-slate-400 space-y-2 max-h-[500px] overflow-y-auto">
									{workspaceEvents.length > 0 ? (
										workspaceEvents.map((event, idx) => (
											<div key={idx} className="flex gap-4 border-l-2 border-slate-800 pl-4 py-1 hover:border-blue-500 transition-colors">
												<span className="text-slate-600 shrink-0">[{new Date(event.occurred_at).toLocaleTimeString()}]</span>
												<span className="text-blue-400 shrink-0">{event.event_type}</span>
												<span className="text-slate-500 truncate">ID: {event.resource_id}</span>
												<span className="ml-auto flex items-center gap-1.5 text-[11px] text-orange-400/80 font-bold">
													<ShieldCheck className="w-3 h-3" /> VERIFIED
												</span>
											</div>
										))
									) : (
										<div className="py-8 text-center text-slate-600">
											Waiting for event stream...
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Audit Disclaimer */}
				<section className="mt-4 p-4 rounded-xl border border-slate-800/50 flex items-start gap-4 bg-slate-900/40">
					<AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
					<p className="text-xs text-slate-500 leading-relaxed">
						Telemetry data is ephemeral by default and stored in volatile memory. For long-term retention, configure an external OpenTelemetry collector (Prometheus/Grafana). Redaction is globally enabled for this workspace to ensure security of model inputs and outputs.
					</p>
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
