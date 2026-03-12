"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	FileText,
	Trash2,
	Search,
	CheckCircle2,
	Loader2,
	FolderOpen,
	Plus,
	Database,
	Clock,
	FileCode,
	HardDrive,
	ArrowDownToLine,
	X,
	AlertCircle,
	Zap,
	Upload,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { formatDate, cn } from "@/lib/utils";
import type { ProjectDocumentSummary } from "@/lib/types/platform";

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
	completed: { icon: CheckCircle2, label: "Indexed", color: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/60" },
	processing: { icon: Loader2, label: "Processing", color: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-800/60" },
	pending: { icon: Clock, label: "Pending", color: "text-slate-400", bg: "bg-slate-800/40", border: "border-slate-700/60" },
	failed: { icon: AlertCircle, label: "Failed", color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-800/60" },
};

type IngestionTracker = {
	documentId: string;
	trackId: string;
	status: "queued" | "reading" | "chunking" | "embedding" | "storing" | "completed" | "failed";
	progress: number;
};

function mergeTrackers(current: IngestionTracker[], incoming: IngestionTracker[]) {
	const merged = new Map(current.map((tracker) => [tracker.trackId, tracker]));
	for (const tracker of incoming) {
		merged.set(tracker.trackId, tracker);
	}
	return Array.from(merged.values());
}

export default function WorkspaceContextDocumentsPage() {
	const { tenant, isReady, hasPermission } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [search, setSearch] = useState("");
	const [showImportModal, setShowImportModal] = useState(false);
	const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
	const [ingestionTrackers, setIngestionTrackers] = useState<IngestionTracker[]>([]);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
	const canManageWorkspaceDocuments = hasPermission("workspace.edit");
	const canUploadWorkspaceDocuments = hasPermission("workspace.edit") && hasPermission("doc.upload");

	// Workspace documents (database records scoped to workspace)
	const { data: documents, isLoading } = useQuery({
		queryKey: ["workspace-context", "documents", workspaceId],
		queryFn: () => platformApi.listWorkspaceDocuments(tenant, workspaceId),
		enabled: isReady && !!workspaceId,
	});

	// Project documents (available for import)
	const { data: projectDocs } = useQuery({
		queryKey: ["project-documents", tenant.organizationId, tenant.projectId],
		queryFn: () => platformApi.listProjectDocuments(tenant),
		enabled: isReady && !!tenant.projectId && showImportModal,
	});

	// WebSocket for ingestion progress
	useEffect(() => {
		if (ingestionTrackers.length === 0) return;

		const activeTrackers = ingestionTrackers.filter(t => t.status !== "completed" && t.status !== "failed");
		if (activeTrackers.length === 0) return;

		const sockets: WebSocket[] = [];
		for (const tracker of activeTrackers) {
			try {
				const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
				const wsHost = window.location.hostname;
				const wsPort = 8000;
				const wsUrl = `${wsProto}//${wsHost}:${wsPort}/ws/uploads/${tracker.trackId}`;
				const ws = new WebSocket(wsUrl);
				sockets.push(ws);

				ws.addEventListener("message", (ev) => {
					try {
						const data = JSON.parse(ev.data);
						setIngestionTrackers(prev => prev.map(t =>
							t.trackId === tracker.trackId
								? { ...t, status: data.status ?? t.status, progress: data.progress ?? t.progress }
								: t
						));

						if (data.status === "completed" || data.status === "failed") {
							ws.close();
							queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents"] });
						}
					} catch { }
				});

				ws.addEventListener("error", () => ws.close());
			} catch { }
		}

		return () => {
			for (const ws of sockets) {
				try { ws.close(); } catch { }
			}
		};
	}, [ingestionTrackers, queryClient]);

	// Ingest mutation
	const ingestMutation = useMutation({
		mutationFn: (docIds: string[]) =>
			platformApi.ingestProjectFiles(tenant, workspaceId, docIds),
		onSuccess: (data) => {
			const newTrackers: IngestionTracker[] = data.ingestions.map(ing => ({
				documentId: ing.document_id,
				trackId: ing.track_id,
				status: (ing.status === "completed" ? "completed" : "queued") as IngestionTracker["status"],
				progress: 0,
			}));
			setIngestionTrackers(prev => mergeTrackers(prev, newTrackers));
			setShowImportModal(false);
			setSelectedDocIds(new Set());

			// Also invalidate to refresh list even if WS doesn't work
			setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents"] });
				queryClient.invalidateQueries({ queryKey: ["project-documents"] });
			}, 3000);
		},
	});

	// Upload mutation
	const uploadMutation = useMutation({
		mutationFn: (file: File) => 
			platformApi.uploadWorkspaceDocument(tenant, workspaceId, file, (pct) => setUploadProgress(pct)),
		onSuccess: (response) => {
			setUploadProgress(null);
			const ingestion = response.ingestion;
			if (ingestion) {
				setIngestionTrackers(prev =>
					mergeTrackers(prev, [
						{
							documentId: ingestion.document_id,
							trackId: ingestion.track_id,
							status: (ingestion.status === "completed" ? "completed" : "queued") as IngestionTracker["status"],
							progress: ingestion.status === "completed" ? 100 : 0,
						},
					])
				);
			}
			queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents"] });
		},
		onError: () => {
			setUploadProgress(null);
		},
	});

	const removeMutation = useMutation({
		mutationFn: (documentId: string) => platformApi.deleteWorkspaceDocument(tenant, workspaceId, documentId),
		onMutate: (documentId) => {
			setDeletingDocumentId(documentId);
		},
		onSuccess: async (_data, documentId) => {
			setIngestionTrackers((prev) => prev.filter((tracker) => tracker.documentId !== documentId));
			await queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents", workspaceId] });
			await queryClient.invalidateQueries({ queryKey: ["project-documents"] });
		},
		onSettled: () => {
			setDeletingDocumentId(null);
		},
	});

	const handleUpload = useCallback((files: FileList | null) => {
		if (!files?.length) return;
		for (let i = 0; i < files.length; i++) {
			uploadMutation.mutate(files[i]);
		}
	}, [uploadMutation]);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragActive(false);
		handleUpload(e.dataTransfer.files);
	}, [handleUpload]);

	const toggleDocSelection = useCallback((docId: string) => {
		setSelectedDocIds(prev => {
			const next = new Set(prev);
			if (next.has(docId)) next.delete(docId);
			else next.add(docId);
			return next;
		});
	}, []);

	const handleImport = useCallback(() => {
		if (selectedDocIds.size === 0) return;
		ingestMutation.mutate(Array.from(selectedDocIds));
	}, [selectedDocIds, ingestMutation]);

	const handleRemove = useCallback((documentId: string, title: string) => {
		if (!confirm(`Remove "${title}" from this workspace knowledge base?`)) {
			return;
		}
		removeMutation.mutate(documentId);
	}, [removeMutation]);

	const filteredDocs = (documents ?? []).filter(doc =>
		doc.title.toLowerCase().includes(search.toLowerCase())
	);
	const workspaceDocumentIds = new Set((documents ?? []).map((doc) => doc.id));

	const indexedCount = filteredDocs.filter(d => d.status === "completed").length;
	const totalSize = filteredDocs.reduce((sum, d) => sum + (d.file_size || 0), 0);

	const stats = [
		{ label: "Total Knowledge", value: filteredDocs.length, icon: Database, color: "text-blue-400", bg: "bg-blue-500/10" },
		{ label: "Indexed", value: indexedCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
		{ label: "Total Size", value: formatFileSize(totalSize), icon: HardDrive, color: "text-amber-400", bg: "bg-amber-500/10" },
	];

	return (
		<WorkspaceGuard>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 animate-in fade-in-from-bottom-4 duration-700">
				<PageShell
					title="Knowledge Base"
					scopeLabel="Workspace"
					subtitle="Manage indexed documents locally. Direct upload or import from project library."
				>

				{/* Quick Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{stats.map((stat) => (
						<div key={stat.label} className="surface flex items-center gap-5 p-6">
							<div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg)}>
								<stat.icon size={26} className={stat.color} />
							</div>
							<div className="flex flex-col">
								<span className="text-[11px] font-bold uppercase tracking-widest text-[#9ca3af] mb-0.5">{stat.label}</span>
								<span className="text-2xl font-black text-[#e5e5e5]">{stat.value}</span>
							</div>
						</div>
					))}
				</div>

				{/* Ingestion Progress */}
				{ingestionTrackers.filter(t => t.status !== "completed" && t.status !== "failed").length > 0 && (
					<div className="surface p-6">
						<div className="flex items-center gap-3 mb-4">
							<Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
							<span className="text-sm font-bold text-amber-300 uppercase tracking-wider">Ingestion in Progress</span>
						</div>
						<div className="space-y-3">
							{ingestionTrackers.filter(t => t.status !== "completed" && t.status !== "failed").map(tracker => (
								<div key={tracker.trackId} className="flex items-center gap-4">
									<div className="flex-1">
										<div className="flex justify-between items-center mb-1.5">
											<span className="text-xs font-bold text-[#e5e5e5]">Document Processing...</span>
											<span className="text-[10px] font-black uppercase tracking-wider text-amber-400">{tracker.status}</span>
										</div>
										<div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-500"
												style={{ width: `${tracker.progress}%` }}
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Direct Upload Zone */}
				<div
					className={cn(
						"relative rounded-[2rem] border-2 border-dashed p-8 transition-all duration-300 group",
						canUploadWorkspaceDocuments ? "cursor-pointer" : "cursor-default opacity-70",
						dragActive
							? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
							: "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
					)}
					onDragOver={(e) => { if (!canUploadWorkspaceDocuments) return; e.preventDefault(); setDragActive(true); }}
					onDragLeave={() => setDragActive(false)}
					onDrop={handleDrop}
					onClick={() => { if (canUploadWorkspaceDocuments) fileInputRef.current?.click(); }}
				>
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						accept=".pdf,.txt,.md,.doc,.docx,.csv"
						multiple
						onChange={(e) => handleUpload(e.target.files)}
					/>

					{uploadProgress !== null ? (
						<div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
							<Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
							<div className="text-center">
								<p className="text-sm font-bold text-[#e5e5e5]">Indexing document...</p>
								<p className="text-xs text-[#9ca3af] mt-1">{uploadProgress}% complete</p>
							</div>
							<div className="w-64 h-1.5 bg-[#222] rounded-full overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center gap-4">
							<div className={cn(
								"h-16 w-16 rounded-3xl flex items-center justify-center transition-all duration-300 border",
								dragActive
									? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40"
									: "bg-[#121212] text-[#9ca3af] border-[#2a2a2a] group-hover:text-indigo-400 group-hover:border-indigo-500/30"
							)}>
								<Upload size={28} />
							</div>
							<div className="text-center">
								<p className="text-sm font-bold text-[#e5e5e5]">
									{canUploadWorkspaceDocuments ? (dragActive ? "Drop files to index" : "Click or drag files to index directly") : "Read-only workspace knowledge"}
								</p>
								<p className="text-xs text-[#9ca3af] mt-1 italic opacity-70">{canUploadWorkspaceDocuments ? "Files are uploaded and indexed into this workspace automatically." : "Uploading and importing require workspace edit and document upload access."}</p>
							</div>
						</div>
					)}
				</div>

				{/* Search and Action Bar */}
				<div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1a1a1a]/50 p-3 rounded-[2.5rem] border border-[#2a2a2a] backdrop-blur-md shadow-inner">
					<div className="flex-1 relative group w-full">
						<div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-indigo-500 transition-colors">
							<Search size={20} />
						</div>
						<Input
							placeholder="Search workspace knowledge..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-14 h-14 w-full rounded-[2rem] border-transparent bg-[#121212] shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-[#e5e5e5] placeholder:text-[#9ca3af]"
						/>
						{search && (
							<button onClick={() => setSearch("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#e5e5e5]">
								<X size={16} />
							</button>
						)}
					</div>
					<div className="flex items-center gap-2 p-1 pr-2 w-full sm:w-auto">
						<Button
							onClick={() => setShowImportModal(true)}
							variant="outline"
							disabled={!canManageWorkspaceDocuments}
							className="h-14 px-6 rounded-[1.8rem] border-[#2a2a2a] bg-[#121212] hover:bg-[#222] text-[#9ca3af] hover:text-[#e5e5e5] font-bold gap-2 transition-all"
						>
							<ArrowDownToLine size={18} />
							Import Library
						</Button>
					</div>
				</div>

				{/* Documents Section */}
				<div className="flex flex-col gap-5">
					{isLoading ? (
						<div className="py-24 flex flex-col items-center justify-center gap-4 animate-pulse">
							<div className="h-12 w-12 rounded-2xl bg-[#222] flex items-center justify-center">
								<Loader2 className="h-8 w-8 text-[#555] animate-spin" />
							</div>
							<span className="text-sm font-bold text-[#555] uppercase tracking-widest">Accessing Vectors</span>
						</div>
					) : filteredDocs.length > 0 ? (
						<div className="grid grid-cols-1 gap-4">
							{filteredDocs.map((doc) => {
								const sc = statusConfig[doc.status] ?? statusConfig.pending;
								const StatusIcon = sc.icon;
								return (
									<Card key={doc.id} className="border border-[#2a2a2a] bg-[#1a1a1a] shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden group hover:border-indigo-500/30">
										<CardContent className="p-0">
											<div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 sm:p-8 gap-6">
												<div className="flex items-center gap-6 flex-1 min-w-0">
													<div className="h-14 w-14 shrink-0 rounded-2xl bg-[#121212] flex items-center justify-center text-[#9ca3af] group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all duration-300 border border-[#2a2a2a]">
														{doc.title.endsWith('.pdf') ? <FileText size={28} /> : <FileCode size={28} />}
													</div>
													<div className="flex flex-col min-w-0">
														<div className="flex items-center gap-3 mb-1">
															<h3 className="text-lg font-bold text-[#e5e5e5] truncate tracking-tight uppercase tracking-tight">{doc.title}</h3>
															<span className="px-2.5 py-0.5 rounded-lg bg-[#222] text-[#9ca3af] text-[10px] font-black uppercase tracking-wider shrink-0">
																{doc.extension || 'FILE'}
															</span>
														</div>
														<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#6b7280]">
															<div className="flex items-center gap-1.5">
																<Clock size={12} />
																<span className="text-[11px] font-black uppercase tracking-widest">{formatDate(doc.created_at)}</span>
															</div>
															<div className="h-1 w-1 rounded-full bg-[#333]" />
															<div className="flex items-center gap-1.5">
																<HardDrive size={12} />
																<span className="text-[11px] font-black uppercase tracking-widest">{formatFileSize(doc.file_size)}</span>
															</div>
															{doc.source && (
																<>
																	<div className="h-1 w-1 rounded-full bg-[#333]" />
																	<div className="flex items-center gap-1.5">
																		<Zap size={12} className="text-indigo-400/60" />
																		<span className="text-[11px] font-black uppercase tracking-widest opacity-80">{doc.source === 'upload' ? 'Direct Upload' : doc.source}</span>
																	</div>
																</>
															)}
														</div>
													</div>
												</div>

												<div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 shrink-0 pt-4 lg:pt-0 border-t lg:border-none border-[#2a2a2a]">
													<div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm", sc.bg, sc.border)}>
														<StatusIcon size={14} className={cn(sc.color, doc.status === "processing" && "animate-spin")} />
														<span className={cn("font-black text-[10px] uppercase tracking-widest", sc.color)}>{sc.label}</span>
													</div>
													<Button
														variant="ghost"
														className="h-12 w-12 p-0 rounded-2xl text-[#9ca3af] hover:text-rose-400 hover:bg-rose-950/40 transition-all border border-transparent hover:border-rose-800/60"
														onClick={() => handleRemove(doc.id, doc.title)}
														disabled={!canManageWorkspaceDocuments || removeMutation.isPending}
														aria-label={`Remove ${doc.title} from workspace`}
													>
														{deletingDocumentId === doc.id && removeMutation.isPending ? (
															<Loader2 size={20} className="animate-spin" />
														) : (
															<Trash2 size={20} />
														)}
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					) : (
						<div className="p-24 flex flex-col items-center justify-center text-center bg-[#1a1a1a] rounded-[3rem] border-2 border-dashed border-[#2a2a2a] animate-in zoom-in-95 duration-1000 shadow-inner">
							<div className="h-24 w-24 rounded-[2rem] bg-[#121212] border border-[#2a2a2a] flex items-center justify-center text-[#6b7280] mb-6 drop-shadow-sm">
								<FolderOpen size={48} />
							</div>
							<h3 className="text-2xl font-black text-[#e5e5e5] mb-3 tracking-tight">Empty Knowledge Base</h3>
							<p className="text-[#9ca3af] max-w-sm mx-auto font-semibold leading-relaxed mb-8">
								Index documents directly to this workspace or import from your project library to power up your RAG.
							</p>
							<div className="flex flex-col sm:flex-row items-center gap-4">
								<Button
									onClick={() => fileInputRef.current?.click()}
									className="h-12 px-8 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 transition-all shadow-lg shadow-indigo-500/20"
								>
									<Upload size={18} />
									Index Document
								</Button>
								<Button
									onClick={() => setShowImportModal(true)}
									variant="outline"
									className="h-12 px-8 rounded-[1.5rem] border-[#2a2a2a] bg-[#121212] hover:bg-[#222] text-[#9ca3af] font-bold gap-2 transition-all"
								>
									<ArrowDownToLine size={18} />
									Import Library
								</Button>
							</div>
						</div>
					)}
				</div>

				</PageShell>

				{/* Footer */}
				<footer className="flex flex-col items-center text-center p-6 rounded-[2rem] bg-[#1a1a1a]/30 border border-[#2a2a2a]/50">
					<div className="flex items-center gap-2 mb-2">
						<div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
						<span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Karag Engine v0.1.0-alpha</span>
					</div>
					<p className="text-xs text-[#6b7280] font-bold max-w-md">
						Workspace data is isolated and stored within your secure infrastructure.
					</p>
				</footer>
			</div>

			{/* Import Modal */}
			{showImportModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[2rem] shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
							<div className="flex flex-col">
								<h2 className="text-xl font-black text-[#e5e5e5] tracking-tight">Import from Project</h2>
								<p className="text-xs text-[#9ca3af] mt-1">Select documents to ingest into this workspace&apos;s RAG pipeline</p>
							</div>
							<button
								onClick={() => { setShowImportModal(false); setSelectedDocIds(new Set()); }}
								className="h-10 w-10 rounded-xl bg-[#222] text-[#9ca3af] hover:text-[#e5e5e5] hover:bg-[#333] transition-all flex items-center justify-center"
							>
								<X size={18} />
							</button>
						</div>

						{/* Modal Body - Document List */}
						<div className="flex-1 overflow-y-auto p-6">
							{!projectDocs ? (
								<div className="py-12 flex flex-col items-center gap-3">
									<Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
									<span className="text-sm text-[#9ca3af] font-bold">Loading project documents...</span>
								</div>
							) : projectDocs.length === 0 ? (
								<div className="py-12 flex flex-col items-center gap-3 text-center">
									<FolderOpen className="h-12 w-12 text-[#555]" />
									<p className="text-sm text-[#9ca3af] font-bold">No documents in project yet. Upload files first.</p>
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{/* Select all */}
									<div className="flex items-center justify-between px-4 py-2 mb-2">
										<button
											onClick={() => {
												if (selectedDocIds.size === projectDocs.length) {
													setSelectedDocIds(new Set());
												} else {
													setSelectedDocIds(new Set(projectDocs.map(d => d.id)));
												}
											}}
											className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
										>
											{selectedDocIds.size === projectDocs.length ? "Deselect All" : "Select All"}
										</button>
										<span className="text-xs text-[#9ca3af] font-bold">
											{selectedDocIds.size} of {projectDocs.length} selected
										</span>
									</div>

									{projectDocs.map((doc: ProjectDocumentSummary) => {
										const isSelected = selectedDocIds.has(doc.id);
										const isAlreadyInWorkspace = workspaceDocumentIds.has(doc.id);
										return (
											<button
												key={doc.id}
												disabled={isAlreadyInWorkspace}
												onClick={() => toggleDocSelection(doc.id)}
												className={cn(
													"flex items-center gap-4 p-4 rounded-2xl border transition-all text-left w-full",
													isSelected
														? "bg-indigo-500/10 border-indigo-500/40 shadow-sm"
														: isAlreadyInWorkspace
															? "opacity-50 grayscale cursor-not-allowed bg-[#121212] border-[#222]"
															: "bg-[#121212] border-[#2a2a2a] hover:border-[#444]"
												)}
											>
												{/* Checkbox */}
												<div className={cn(
													"h-5 w-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
													isSelected
														? "bg-indigo-500 border-indigo-500"
														: isAlreadyInWorkspace
															? "bg-emerald-500 border-emerald-500"
															: "border-[#555] bg-transparent"
												)}>
													{isSelected && <CheckCircle2 size={12} className="text-white" />}
													{isAlreadyInWorkspace && <CheckCircle2 size={12} className="text-white" />}
												</div>

												{/* File icon */}
												<div className="h-10 w-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#9ca3af] shrink-0 border border-[#2a2a2a]">
													{doc.title.endsWith('.pdf') ? <FileText size={18} /> : <FileCode size={18} />}
												</div>

												{/* File details */}
												<div className="flex flex-col flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="text-sm font-bold text-[#e5e5e5] truncate">{doc.title}</span>
														{isAlreadyInWorkspace && (
															<span className="text-[8px] font-black uppercase tracking-tighter bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md">In Workspace</span>
														)}
													</div>
													<div className="flex items-center gap-3 mt-0.5">
														<span className="text-[10px] text-[#9ca3af] font-bold uppercase">{formatFileSize(doc.file_size)}</span>
														<div className="h-1 w-1 rounded-full bg-[#555]" />
														<span className="text-[10px] text-[#9ca3af] font-bold uppercase">{doc.title.split('.').pop() || 'UNC'}</span>
														<div className="h-1 w-1 rounded-full bg-[#555]" />
														<span className={cn(
															"text-[10px] font-bold uppercase",
															doc.status === "completed" ? "text-emerald-400" : "text-amber-400"
														)}>
															{doc.status}
														</span>
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						{/* Modal Footer */}
						<div className="flex items-center justify-between p-6 border-t border-[#2a2a2a]">
							<Button
								variant="ghost"
								onClick={() => { setShowImportModal(false); setSelectedDocIds(new Set()); }}
								className="h-12 px-6 rounded-[1.5rem] text-[#9ca3af] font-bold hover:text-[#e5e5e5]"
							>
								Cancel
							</Button>
							<Button
								disabled={selectedDocIds.size === 0 || ingestMutation.isPending}
								onClick={handleImport}
								className={cn(
									"h-12 px-8 rounded-[1.5rem] font-bold gap-2 transition-all shadow-lg",
									selectedDocIds.size > 0
										? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
										: "bg-[#333] text-[#666] cursor-not-allowed"
								)}
							>
								{ingestMutation.isPending ? (
									<>
										<Loader2 size={16} className="animate-spin" />
										Ingesting...
									</>
								) : (
									<>
										<Zap size={16} />
										Ingest {selectedDocIds.size} Document{selectedDocIds.size !== 1 ? "s" : ""}
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</WorkspaceGuard>
	);
}
