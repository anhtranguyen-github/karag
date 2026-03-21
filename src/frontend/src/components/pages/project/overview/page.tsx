"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/tables/data-table";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { formatCount, formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";
import { generateWorkspaceUrl } from "@/lib/navigation";

import { useState, useMemo } from "react";

export default function ProjectOverviewPageView() {
	const { tenant, projects, workspaces } = useTenant();
	const selectedProject = projects.find((project) => project.id === tenant.projectId);
	const [search, setSearch] = useState("");

	const observabilityQuery = useQuery({
		queryKey: ["project-overview", "observability"],
		queryFn: platformApi.observabilitySummary
	});

	const projectEvents = (observabilityQuery.data?.events ?? []).filter(
		(event) => !event.workspace_id || workspaces.some((workspace) => workspace.id === event.workspace_id)
	);

	const filteredWorkspaces = useMemo(
		() =>
			workspaces.filter((workspace) =>
				[workspace.name, workspace.id]
					.join(" ")
					.toLowerCase()
					.includes(search.toLowerCase())
			),
		[workspaces, search]
	);

	return (
		<ProjectGuard>
			<div className="min-h-screen bg-[#18181b] px-0 py-0">
				<div className="mx-auto w-full max-w-6xl pt-10">
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-2xl font-bold text-[#e5e5e5]">Workspaces</h1>
						<Link
							className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-[#e5e5e5] shadow hover:bg-green-700 transition"
							href="/dashboard/new/workspace"
						>
							+ New workspace
						</Link>
					</div>
					<div className="mb-6 flex items-center gap-3">
						<input
							className="w-full max-w-xs rounded-xl border border-slate-700 bg-[#232329] px-3 py-2 text-sm text-[#e5e5e5] placeholder:text-slate-400 focus:border-green-600 focus:outline-none"
							placeholder="Search for a workspace"
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
						<span className="text-slate-400 text-sm">Status</span>
						<span className="text-slate-400 text-sm">Sorted by name</span>
					</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredWorkspaces.length === 0 ? (
							<div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-[#232329] p-10 text-center text-slate-400">
								No workspaces found.
							</div>
						) : (
							filteredWorkspaces.map((workspace) => (
								<div
									key={workspace.id}
									className="rounded-xl border border-slate-700 bg-[#232329] p-6 shadow hover:shadow-lg transition cursor-pointer flex flex-col justify-between min-h-[160px] active:scale-[0.98]"
									onClick={() => window.location.href = generateWorkspaceUrl(workspace.id)}
								>
									<div>
										<div className="flex items-center justify-between mb-2">
											<span className="text-lg font-semibold text-[#e5e5e5]">{workspace.name}</span>
											<span className="inline-flex items-center rounded-full bg-green-900/30 px-3 py-1 text-xs font-medium text-green-400 border border-green-800">ACTIVE</span>
										</div>
										<div className="text-xs text-slate-400 mb-1">Workspace</div>
										<div className="text-xs text-slate-500">{workspace.id}</div>
									</div>
									<div className="mt-4 flex gap-2">
										<span className="inline-flex items-center rounded-full bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">NANO</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</ProjectGuard>
	);
}
