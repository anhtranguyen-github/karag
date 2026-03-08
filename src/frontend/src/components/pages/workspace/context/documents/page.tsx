"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	FileText,
	Upload,
	Trash2,
	Search,
	Filter,
	CheckCircle2,
	Clock,
	AlertCircle,
	File,
	Download,
	ExternalLink,
	Loader2 as LoaderIcon,
	X,
	PlusCircle,
	FolderOpen
} from "lucide-react";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { cn, formatDate } from "@/lib/utils";

export default function WorkspaceContextDocumentsPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { data: datasets } = useQuery({
		queryKey: ["workspace-context", "datasets", workspaceId],
		queryFn: () => platformApi.listKnowledgeDatasets(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const activeDataset = datasets?.[0]; // Default to first dataset for upload

	const { data: documents, isLoading } = useQuery({
		queryKey: ["workspace-context", "documents", workspaceId],
		queryFn: () => platformApi.listRuntimeDocuments(tenant, workspaceId),
		enabled: !!workspaceId,
	});

	const uploadMutation = useMutation({
		mutationFn: async ({ file, datasetId }: { file: File, datasetId: string }) => {
			setIsUploading(true);
			return platformApi.uploadDatasetDocument(tenant, datasetId, file, (progress) => {
				setUploadProgress(progress);
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-context", "documents", workspaceId] });
			setIsUploading(false);
			setUploadProgress(0);
		},
		onError: () => {
			setIsUploading(false);
			setUploadProgress(0);
		}
	});

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && activeDataset) {
			uploadMutation.mutate({ file, datasetId: activeDataset.id });
		}
	};

	const filteredDocs = (documents ?? []).filter(doc =>
		doc.title.toLowerCase().includes(search.toLowerCase())
	);

	return (
		<WorkspaceGuard>
			<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">Context Documents</h1>
						<p className="text-slate-500">
							Manage the specific files that inform your AI workspace context.
						</p>
					</div>
					<div className="flex gap-3">
						<label className="cursor-pointer">
							<input type="file" className="hidden" onChange={handleFileUpload} disabled={!activeDataset || isUploading} />
							<div className={cn(
								"flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg",
								activeDataset && !isUploading
									? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10"
									: "bg-slate-100 text-slate-400 cursor-not-allowed"
							)}>
								{isUploading ? <LoaderIcon size={18} className="animate-spin" /> : <Upload size={18} />}
								{isUploading ? `Uploading ${uploadProgress}%` : "Upload Document"}
							</div>
						</label>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="flex items-center gap-4">
					<div className="flex-1 relative group">
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
							<Search size={18} />
						</div>
						<Input
							placeholder="Search documents by filename..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10 h-12 rounded-xl border-slate-200 focus:border-slate-500 bg-white shadow-sm"
						/>
					</div>
					<Button variant="outline" className="h-12 rounded-xl border-slate-200 text-slate-600 font-bold gap-2 px-6">
						<Filter size={18} />
						Filters
					</Button>
				</div>

				{/* Documents Grid */}
				<div className="space-y-4">
					{isLoading ? (
						<div className="p-12 flex justify-center">
							<LoaderIcon className="h-8 w-8 text-slate-500 animate-spin" />
						</div>
					) : filteredDocs.length > 0 ? (
						<div className="grid grid-cols-1 gap-4">
							{filteredDocs.map((doc) => (
								<Card key={doc.id} className="border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group overflow-hidden">
									<CardContent className="p-0">
										<div className="flex items-center justify-between p-4 px-6 sm:p-6">
											<div className="flex items-center gap-4 flex-1 min-w-0">
												<div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-slate-100 transition-colors">
													<FileText size={22} />
												</div>
												<div className="flex flex-col min-w-0">
													<div className="flex items-center gap-2">
														<h3 className="font-bold text-slate-900 truncate">{doc.title}</h3>
														<span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">PDF</span>
													</div>
													<div className="flex items-center gap-3 mt-1">
														<span className="text-xs text-slate-400 font-medium">Uploaded {doc.created_at ? formatDate(doc.created_at) : 'recently'}</span>
														<div className="h-1 w-1 rounded-full bg-slate-300" />
														<span className="text-xs text-slate-400 font-medium">{doc.metadata.size ? `${(Number(doc.metadata.size) / 1024).toFixed(1)} KB` : '42 KB'}</span>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-4 sm:gap-8 shrink-0">
												<div className="hidden sm:flex flex-col items-end gap-1">
													<div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
														<CheckCircle2 size={12} />
														Indexed
													</div>
													<span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{String(doc.metadata.content_type || 'application/pdf')}</span>
												</div>
												<div className="flex items-center gap-1">
													<Button variant="ghost" className="h-10 w-10 p-0 rounded-lg text-slate-400 hover:text-slate-900 group-hover:bg-slate-50">
														<Download size={18} />
													</Button>
													<Button variant="ghost" className="h-10 w-10 p-0 rounded-lg text-slate-400 hover:text-rose-500 group-hover:bg-rose-50">
														<Trash2 size={18} />
													</Button>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="p-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 animate-in fade-in duration-700">
							<div className="h-24 w-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6 drop-shadow-sm">
								<FolderOpen size={48} />
							</div>
							<h3 className="text-2xl font-bold text-slate-900 mb-2">No documents indexed</h3>
							<p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
								Upload files to your workspace to provide context to your AI agents. We support PDF, Markdown, and Text formats.
							</p>
							<label className="cursor-pointer">
								<input type="file" className="hidden" onChange={handleFileUpload} disabled={!activeDataset || isUploading} />
								<div className={cn(
									"flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl",
									activeDataset && !isUploading
										? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
										: "bg-slate-100 text-slate-400 cursor-not-allowed"
								)}>
									<PlusCircle size={22} />
									Bring your data
								</div>
							</label>
							{!activeDataset && (
								<p className="mt-4 text-xs text-rose-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
									<AlertCircle size={14} />
									Please create a RAG dataset first
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</WorkspaceGuard>
	);
}
