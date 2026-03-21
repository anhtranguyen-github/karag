"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	FileText,
	Trash2,
	Search,
	Filter,
	CheckCircle2,
	Download,
	Loader2 as LoaderIcon,
	FolderOpen,
	Plus,
	Activity,
	Database,
	Clock,
	FileCode,
	Zap,
	HardDrive
} from "lucide-react";
import { useParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function WorkspaceContextDocumentsPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;

	const [search, setSearch] = useState("");

	const { data: documents, isLoading } = useQuery({
		queryKey: ["workspace-context", "documents", workspaceId],
		queryFn: () => platformApi.listRuntimeDocuments(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const filteredDocs = (documents ?? []).filter(doc =>
		doc.title.toLowerCase().includes(search.toLowerCase())
	);

	const stats = [
		{ label: 'Total Files', value: documents?.length ?? 0, icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
		{ label: 'Indexed', value: documents?.length ?? 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
		{ label: 'Average Size', value: '452 KB', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
	];

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-10 p-4 sm:p-10 max-w-7xl mx-auto w-full animate-in fade-in-from-bottom-4 duration-700">
				<PageShell
					title="Knowledge Base"
					scopeLabel="Workspace"
					subtitle="Manage your indexed documents and monitor the ingestion pipeline."
				>

				{/* Quick Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{stats.map((stat) => (
						<div key={stat.label} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
							<div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
								<stat.icon size={26} />
							</div>
							<div className="flex flex-col">
								<span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</span>
								<span className="text-2xl font-black text-slate-900">{stat.value}</span>
							</div>
						</div>
					))}
				</div>

				{/* Search and Action Bar */}
				<div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-3 rounded-[2.5rem] border border-slate-100 backdrop-blur-md shadow-inner">
					<div className="flex-1 relative group w-full">
						<div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
							<Search size={20} />
						</div>
						<Input
							placeholder="Search by filename, type, or metadata..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-14 h-14 w-full rounded-[2rem] border-transparent bg-white shadow-sm focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-600 placeholder:text-slate-300"
						/>
					</div>
					<div className="flex items-center gap-2 p-1 pr-2 w-full sm:w-auto">
						<Button variant="ghost" className="h-14 px-6 rounded-[1.8rem] text-slate-500 font-bold gap-2 hover:bg-white hover:text-slate-900 transition-all">
							<Filter size={20} />
							Refine
						</Button>
						<div className="w-[1px] h-8 bg-slate-200 hidden sm:block mx-1" />
						<Button variant="ghost" className="h-14 px-6 rounded-[1.8rem] text-slate-500 font-bold gap-2 hover:bg-white hover:text-slate-900 transition-all">
							<Clock size={20} />
							Recent
						</Button>
					</div>
				</div>

				{/* Documents Section */}
				<div className="flex flex-col gap-6">
					{isLoading ? (
						<div className="py-24 flex flex-col items-center justify-center gap-4 animate-pulse">
							<div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
								<LoaderIcon className="h-8 w-8 text-slate-300 animate-spin" />
							</div>
							<span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Accessing Vectors</span>
						</div>
					) : filteredDocs.length > 0 ? (
						<div className="grid grid-cols-1 gap-5">
							{filteredDocs.map((doc) => (
								<Card key={doc.id} className="border-none bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden group border-2 border-transparent hover:border-indigo-50/50">
									<CardContent className="p-0">
										<div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 sm:p-8 gap-6">
											{/* File Info */}
											<div className="flex items-center gap-6 flex-1 min-w-0">
												<div className="h-16 w-16 shrink-0 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all duration-300 border border-slate-100/50">
													{doc.title.endsWith('.pdf') ? <FileText size={32} /> : <FileCode size={32} />}
												</div>
												<div className="flex flex-col min-w-0">
													<div className="flex items-center gap-3 mb-1.5">
														<h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{doc.title}</h3>
														<span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors italic">
															{doc.title.split('.').pop() || 'UNC'}
														</span>
													</div>
													<div className="flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-300">
														<div className="flex items-center gap-1.5 text-slate-400">
															<Clock size={12} />
															<span className="text-[11px] font-bold uppercase tracking-wider">{doc.created_at ? formatDate(doc.created_at) : "now"}</span>
														</div>
														<div className="h-1 w-1 rounded-full bg-slate-200" />
														<div className="flex items-center gap-1.5 text-slate-400">
															<HardDrive size={12} />
															<span className="text-[11px] font-bold uppercase tracking-wider">{doc.metadata.size ? `${(Number(doc.metadata.size) / 1024).toFixed(0)} KB` : "42 KB"}</span>
														</div>
													</div>
												</div>
											</div>

											{/* Secondary Info & Actions */}
											<div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 shrink-0 pt-4 lg:pt-0 border-t lg:border-none border-slate-50">
												<div className="flex flex-col items-start lg:items-end gap-1.5">
													<div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
														<CheckCircle2 size={14} className="fill-emerald-500 text-white" />
														<span className="font-black text-[10px] uppercase tracking-widest">Indexed</span>
													</div>
													<span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] lg:text-right">
														{String(doc.metadata.content_type || "application/octet-stream").split('/')[1]} stream
													</span>
												</div>
												<div className="flex items-center gap-2">
													<Button variant="ghost" className="h-12 w-12 p-0 rounded-2xl text-slate-300 hover:text-[#0f172a] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
														<Download size={20} />
													</Button>
													<Button variant="ghost" className="h-12 w-12 p-0 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100">
														<Trash2 size={20} />
													</Button>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="p-32 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-in zoom-in-95 duration-1000 shadow-inner">
							<div className="h-32 w-32 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-8 drop-shadow-sm scale-110">
								<FolderOpen size={64} />
							</div>
							<h3 className="text-3xl font-black text-[#0f172a] mb-3 tracking-tight">Empty Knowledge Base</h3>
							<p className="text-slate-500 max-w-sm mx-auto font-semibold leading-relaxed mb-10">
								There are no documents in this workspace context. Connect your files to the AI engine to get started.
							</p>
							<div className="text-slate-400 font-semibold text-lg">No documents found. Add files to your workspace to get started.</div>
						</div>
					)}
				</div>

				</PageShell>

				{/* Footer Info / OSS Notice */}
				<footer className="mt-12 flex flex-col items-center text-center p-8 rounded-[3rem] bg-indigo-50/30 border border-indigo-100/50">
					<div className="flex items-center gap-2 mb-3">
						<div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
						<span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Karag Engine v0.1.0-alpha</span>
					</div>
					<p className="text-xs text-indigo-400/80 font-bold max-w-md">
						All data indexed and stored locally or on your infrastructure.
					</p>
				</footer>
			</div>
		</WorkspaceGuard>
	);
}
