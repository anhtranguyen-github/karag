"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
	Search,
	Filter,
	HardDrive,
	Box,
	FileText,
	Layers,
	PieChart,
	ExternalLink,
	ShieldCheck,
	LayoutGrid,
	List
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectGuard } from "@/components/ui/project-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

export default function ProjectDocumentsPageView() {
	const { tenant, workspaces } = useTenant();
	const [search, setSearch] = useState("");
	const [workspaceFilter, setWorkspaceFilter] = useState("all");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");

	const workspaceNameMap = useMemo(
		() => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
		[workspaces]
	);

	const documentQueries = useQueries({
		queries: workspaces.map((workspace) => ({
			queryKey: ["project-documents", tenant.organizationId, tenant.projectId, workspace.id],
			queryFn: () =>
				platformApi.listRuntimeDocuments(
					{ ...tenant, workspaceId: workspace.id },
					workspace.id
				)
		}))
	});

	const allDocuments = useMemo(() => {
		return documentQueries.flatMap((query, index) =>
			(query.data ?? []).map((document) => ({
				...document,
				workspaceName: workspaceNameMap.get(workspaces[index]?.id ?? "") ?? "Unknown"
			}))
		).filter((document) => {
			const searchHaystack = [document.title, document.storage_path, document.workspaceName]
				.join(" ")
				.toLowerCase();
			const matchesSearch = searchHaystack.includes(search.toLowerCase());
			const matchesWorkspace =
				workspaceFilter === "all" || document.workspace_id === workspaceFilter;
			return matchesSearch && matchesWorkspace;
		});
	}, [documentQueries, search, workspaceFilter, workspaceNameMap, workspaces]);

	const workspaceStats = useMemo(() => {
		return workspaces.map((ws, idx) => ({
			name: ws.name,
			count: documentQueries[idx].data?.length ?? 0,
			id: ws.id
		}));
	}, [workspaces, documentQueries]);

	return (
		<ProjectGuard>
			<div className="flex flex-col gap-10 p-4 sm:p-10 max-w-7xl mx-auto w-full animate-in fade-in-from-bottom-4 duration-1000">
				<PageShell
					title="Global Assets"
					scopeLabel="Project"
					subtitle="Federated view of all context documents across the project namespaces."
				>

				{/* Storage Insight Panels */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col gap-6 relative overflow-hidden">
						<div className="absolute -right-20 -bottom-20 opacity-[0.03] rotate-12 pointer-events-none">
							<PieChart size={300} />
						</div>
						<div className="flex flex-col gap-1 relative">
							<h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Namespace Residency</h3>
							<p className="text-2xl font-black text-slate-900">Resource Distribution</p>
						</div>
						<div className="flex flex-col gap-4 relative">
							{workspaceStats.slice(0, 3).map((ws) => (
								<div key={ws.id} className="flex flex-col gap-2">
									<div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
										<span>{ws.name}</span>
										<span className="text-blue-500">{ws.count} Docs</span>
									</div>
									<div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
										<div 
											className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.2)] transition-all duration-1000" 
											style={{ width: `${Math.min((ws.count / (allDocuments.length || 1)) * 100, 100)}%` }} 
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
							<ShieldCheck size={120} />
						</div>
						<div className="flex flex-col gap-2">
							<Badge className="bg-blue-500/20 text-blue-400 border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest w-fit mb-2">
								Verified
							</Badge>
							<h3 className="text-xl font-bold leading-tight">Secured Data Sovereignty</h3>
							<p className="text-xs text-slate-400 font-medium leading-relaxed">
								Your documents never leave your infrastructure. All vector indices are maintained on-premise within your cluster.
							</p>
						</div>
						<div className="pt-8">
							<p className="text-3xl font-black tracking-tighter mb-1">{allDocuments.length}</p>
							<p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Global Indexed Objects</p>
						</div>
					</div>
				</div>

				{/* Filter & Table Area */}
				<div className="flex flex-col gap-6">
					<div className="flex flex-col sm:flex-row items-center gap-4">
						<div className="flex-1 relative w-full group">
							<div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
								<Search size={18} />
							</div>
							<Input 
								placeholder="Filter global assets by name, extension or path..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-12 h-12 rounded-2xl border-slate-100 bg-white shadow-sm focus:border-blue-200 transition-all font-medium text-slate-600"
							/>
						</div>
						<div className="flex items-center gap-2 p-1 bg-white border border-slate-100 rounded-2xl shadow-sm w-full sm:w-auto">
							<select 
								value={workspaceFilter} 
								onChange={(e) => setWorkspaceFilter(e.target.value)}
								className="h-10 px-4 bg-transparent text-sm font-bold text-slate-500 focus:outline-none cursor-pointer"
							>
								<option value="all">All Namespaces</option>
								{workspaces.map(ws => (
									<option key={ws.id} value={ws.id}>{ws.name}</option>
								))}
							</select>
							<Button variant="ghost" className="h-10 px-4 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50">
								<Filter size={16} />
							</Button>
						</div>
					</div>

					{viewMode === "list" ? (
						<div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead>
										<tr className="border-b border-slate-50">
											<th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Object Details</th>
											<th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Residency</th>
											<th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pipeline</th>
											<th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Discovery</th>
											<th className="px-8 py-5 text-right pr-10" />
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{allDocuments.map((doc) => (
											<tr key={doc.id} className="group hover:bg-blue-50/30 transition-colors">
												<td className="px-8 py-6">
													<div className="flex items-center gap-4">
														<div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner border border-slate-100/50">
															<FileText size={20} />
														</div>
														<div className="flex flex-col">
															<span className="font-bold text-slate-900 tracking-tight">{doc.title}</span>
															<span className="text-[10px] text-slate-400 font-bold uppercase group-hover:text-blue-400 transition-colors flex items-center gap-1 mt-0.5">
																{(doc.title.split('.').pop() || 'binary').toUpperCase()} • {(doc.metadata?.page_count as number) || 1} pages
															</span>
														</div>
													</div>
												</td>
												<td className="px-8 py-6">
													<Badge className="bg-slate-100 text-slate-500 border-none px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
														{doc.workspaceName}
													</Badge>
												</td>
												<td className="px-8 py-6">
													<div className="flex items-center gap-2">
														<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
														<span className="text-xs font-bold text-slate-600">{String(doc.metadata?.parser || 'marker')}</span>
													</div>
												</td>
												<td className="px-8 py-6">
													<span className="text-xs font-medium text-slate-400 italic font-serif tracking-tighter">{formatDate(doc.created_at)}</span>
												</td>
												<td className="px-8 py-6 text-right pr-10">
													<Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
														<ExternalLink size={16} />
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
							{allDocuments.map((doc) => (
								<Card key={doc.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group p-6">
									<div className="flex flex-col gap-4">
										<div className="flex justify-between items-start">
											<div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
												<FileText size={24} />
											</div>
											<Badge className="bg-blue-50 text-blue-500 border-none text-[9px] font-black uppercase tracking-widest">
												{doc.workspaceName}
											</Badge>
										</div>
										<div className="flex flex-col gap-1">
											<h4 className="font-bold text-slate-900 line-clamp-1">{doc.title}</h4>
											<p className="text-[10px] text-slate-400 font-bold uppercase italic">{formatDate(doc.created_at)}</p>
										</div>
										<div className="flex items-center justify-between pt-2">
											<div className="flex gap-1">
												<Badge variant="outline" className="text-[8px] px-1.5 border-slate-100">{String(doc.metadata?.parser || 'marker')}</Badge>
												<Badge variant="outline" className="text-[8px] px-1.5 border-slate-100">{String((doc.metadata?.page_count as number) || 1)} P</Badge>
											</div>
											<Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-blue-500">
												<ExternalLink size={14} />
											</Button>
										</div>
									</div>
								</Card>
							))}
						</div>
					)}

					{allDocuments.length === 0 && (
						<div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner flex flex-col items-center">
							<div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-6 drop-shadow-sm">
								<Box size={40} />
							</div>
							<h3 className="text-2xl font-black text-slate-900 mb-2">Cluster namespace is empty</h3>
							<p className="text-slate-400 font-medium max-w-sm mx-auto">
								No global assets found matching your criteria. Ingest documents into workspaces to see them here.
							</p>
						</div>
					)}
				</div>
			</PageShell>
			</div>
		</ProjectGuard>
	);
}
