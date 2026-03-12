"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	FileText,
	Upload,
	Search,
	CheckCircle2,
	Loader2,
	FolderOpen,
	Database,
	Clock,
	HardDrive,
	AlertCircle,
	FileCode,
	X,
	Zap,
	Trash2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectGuard } from "@/components/ui/project-guard";
import PageShell from "@/components/ui/page-shell";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { formatDate, cn } from "@/lib/utils";

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

export default function ProjectDocumentsPageView() {
	const { tenant, isReady, hasPermission, isPermissionsReady } = useTenant();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [search, setSearch] = useState("");
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<"created_at" | "title" | "file_size" | "status">("created_at");
	const [currentPage, setCurrentPage] = useState(1);
	const canUploadDocuments = hasPermission("doc.upload");
	const canDeleteDocuments = hasPermission("doc.delete") || hasPermission("doc.upload");

	const { data: documents, isLoading } = useQuery({
		queryKey: ["project-documents", tenant.organizationId, tenant.projectId],
		queryFn: () => platformApi.listProjectDocuments(tenant),
		enabled: isReady && !!tenant.projectId,
	});

	const uploadMutation = useMutation({
		mutationFn: (file: File) => platformApi.uploadProjectDocument(tenant, file, (pct) => setUploadProgress(pct)),
		onSuccess: () => {
			setUploadProgress(null);
			queryClient.invalidateQueries({ queryKey: ["project-documents"] });
		},
		onError: () => {
			setUploadProgress(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (documentId: string) => platformApi.deleteProjectDocument(tenant, documentId),
		onMutate: (documentId) => {
			setDeletingDocumentId(documentId);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["project-documents"] });
			await queryClient.invalidateQueries({ queryKey: ["workspace-documents"] });
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

	const handleDelete = useCallback((documentId: string, title: string) => {
		if (!confirm(`Delete "${title}" from this project? This also removes linked workspace ingestion data.`)) {
			return;
		}
		deleteMutation.mutate(documentId);
	}, [deleteMutation]);

	const filteredDocs = useMemo(() => (documents ?? []).filter(doc =>
		doc.title.toLowerCase().includes(search.toLowerCase())
	), [documents, search]);

	const sortedDocs = useMemo(() => {
		const docs = [...filteredDocs];
		docs.sort((left, right) => {
			if (sortBy === "title") return left.title.localeCompare(right.title);
			if (sortBy === "file_size") return (right.file_size ?? 0) - (left.file_size ?? 0);
			if (sortBy === "status") return left.status.localeCompare(right.status);
			return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
		});
		return docs;
	}, [filteredDocs, sortBy]);

	const pageSize = 10;
	const totalPages = Math.max(1, Math.ceil(sortedDocs.length / pageSize));
	const safePage = Math.min(currentPage, totalPages);
	const paginatedDocs = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return sortedDocs.slice(start, start + pageSize);
	}, [safePage, sortedDocs]);

	const cycleSort = useCallback(() => {
		setCurrentPage(1);
		setSortBy((current) => {
			if (current === "created_at") return "title";
			if (current === "title") return "file_size";
			if (current === "file_size") return "status";
			return "created_at";
		});
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [search]);

	const indexedCount = filteredDocs.filter(d => d.status === "completed").length;
	const totalSize = filteredDocs.reduce((sum, d) => sum + (d.file_size || 0), 0);

	const stats = [
		{ label: "Total Files", value: filteredDocs.length, icon: Database, color: "text-blue-400", bg: "bg-blue-500/10" },
		{ label: "Indexed", value: indexedCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
		{ label: "Total Size", value: formatFileSize(totalSize), icon: HardDrive, color: "text-amber-400", bg: "bg-amber-500/10" },
	];

	return (
		<ProjectGuard>
			<div className="flex-1 overflow-y-auto mb-10 mt-2">
				<div className="max-w-[1520px] mx-auto px-6 space-y-8 animate-in fade-in-from-bottom-4 duration-700">
					{/* Header Section */}
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
						<div>
							<h1 className="text-3xl font-extrabold text-foreground font-display tracking-tight mb-2">Project Documents</h1>
							<p className="text-muted-foreground max-w-xl">Manage your organizational intelligence. Upload technical specs, research papers, or dataset documentation for RAG indexing.</p>
						</div>
						{/* Stats Grid */}
						<div className="grid grid-cols-3 gap-4">
							<div className="bg-popover p-4 rounded-xl border border-border min-w-[120px]">
								<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Total Files</p>
								<p className="text-xl font-display font-extrabold text-foreground">{filteredDocs.length}</p>
							</div>
							<div className="bg-popover p-4 rounded-xl border border-border min-w-[120px]">
								<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Indexed</p>
								<div className="flex items-center gap-2">
									<p className="text-xl font-display font-extrabold text-primary">{indexedCount}</p>
									<span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
								</div>
							</div>
							<div className="bg-popover p-4 rounded-xl border border-border min-w-[120px]">
								<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Storage</p>
								<p className="text-xl font-display font-extrabold text-foreground">{formatFileSize(totalSize)}</p>
							</div>
						</div>
					</div>

					{/* Upload Zone */}
					<section className="relative group">
						<div 
                           onClick={() => {
								if (canUploadDocuments) {
									fileInputRef.current?.click();
								}
						   }}
                           onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                           onDragLeave={() => setDragActive(false)}
                           onDrop={handleDrop}
                           className={cn(
							 "w-full min-h-[12rem] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden p-8",
                             canUploadDocuments ? "cursor-pointer" : "cursor-default opacity-70",
                             dragActive ? "border-primary bg-primary/10" : "border-border bg-card group-hover:border-primary group-hover:bg-muted"
                           )}
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
                                <div className="flex flex-col items-center gap-4 z-10">
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-foreground font-display">Uploading document...</p>
                                        <p className="text-xs text-muted-foreground mt-1">{uploadProgress}% complete</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 z-10">
                                    <span className="material-symbols-outlined text-4xl text-primary mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                                    <h3 className="text-lg font-bold text-foreground font-display">{canUploadDocuments ? "Drop intelligence artifacts here" : "Read-only document library"}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{canUploadDocuments ? "PDF, Markdown, JSON, or Text up to 50MB" : "You can browse documents, but uploading requires document write access."}</p>
                                </div>
                            )}
						</div>
					</section>

					{/* List & Filter Section */}
					<div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
						{/* Table Header / Filters */}
						<div className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-border">
							<div className="relative w-full md:w-96">
								<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">search</span>
								<input 
                                   value={search}
                                   onChange={e => setSearch(e.target.value)}
                                   className="w-full bg-popover border-none rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary placeholder:text-muted-foreground outline-none" 
                                   placeholder="Filter by document name or tag..." 
                                   type="text"
                                />
							</div>
							<div className="flex items-center gap-3">
								<button
									className="px-4 py-2 bg-popover rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
									onClick={() => setSearch("")}
									type="button"
								>
									<span className="material-symbols-outlined text-sm">filter_list</span>
									<span>{search ? "Clear Filter" : "All Documents"}</span>
								</button>
								<button
									className="px-4 py-2 bg-popover rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
									onClick={cycleSort}
									type="button"
								>
									<span className="material-symbols-outlined text-sm">sort</span>
									<span>Sort: {sortBy.replace("_", " ")}</span>
								</button>
							</div>
						</div>

						{/* Modern Table */}
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-popover/50">
										<th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document Name</th>
										<th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Size</th>
										<th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Added</th>
										<th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/50">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="p-12 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></td></tr>
                                    ) : paginatedDocs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-12 text-center text-muted-foreground text-sm font-medium">No documents found.</td></tr>
                                    ) : (
                                        paginatedDocs.map(doc => {
                                            const sc = statusConfig[doc.status] ?? statusConfig.pending;
                                            return (
                                                <tr key={doc.id} className="hover:bg-muted/50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                                    {doc.extension === 'pdf' ? 'picture_as_pdf' : 'description'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-foreground font-body">{doc.title}</p>
                                                                <p className="text-xs text-muted-foreground uppercase">{doc.extension || 'FILE'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</td>
                                                    <td className="px-6 py-5 text-sm text-muted-foreground">{formatDate(doc.created_at)}</td>
													<td className="px-6 py-5">
														<div className="flex items-center justify-between gap-3">
															<span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", sc.bg, sc.border, sc.color)}>
																{doc.status === 'processing' && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", `bg-amber-400`)}></span>}
																{doc.status === 'completed' && <span className={cn("w-1.5 h-1.5 rounded-full", `bg-emerald-400`)}></span>}
																{sc.label}
															</span>
															<button
																type="button"
																className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
																onClick={() => handleDelete(doc.id, doc.title)}
																disabled={!canDeleteDocuments || deleteMutation.isPending}
																aria-label={`Delete ${doc.title}`}
															>
																{deletingDocumentId === doc.id && deleteMutation.isPending ? (
																	<Loader2 className="h-4 w-4 animate-spin" />
																) : canDeleteDocuments ? (
																	<Trash2 className="h-4 w-4" />
																) : (
																	<span className="text-[10px] font-semibold">Read only</span>
																)}
															</button>
														</div>
													</td>
												</tr>
											);
										})
                                    )}
								</tbody>
							</table>
						</div>

						{/* Table Footer / Pagination */}
						<div className="p-4 bg-popover/50 flex justify-between items-center text-sm text-muted-foreground">
							<p>Showing {sortedDocs.length > 0 ? ((safePage - 1) * pageSize) + 1 : 0}-{Math.min(safePage * pageSize, sortedDocs.length)} of {sortedDocs.length} documents</p>
							<div className="flex items-center gap-2">
								<button
									className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30"
									disabled={safePage <= 1}
									onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
									type="button"
								>
									<span className="material-symbols-outlined">chevron_left</span>
								</button>
								<button className="w-8 h-8 flex items-center justify-center rounded bg-primary/10 text-primary font-bold" type="button">{safePage}</button>
								<button
									className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30"
									disabled={safePage >= totalPages}
									onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
									type="button"
								>
									<span className="material-symbols-outlined">chevron_right</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ProjectGuard>
	);
}
