"use client";

import { AlertTriangle, ExternalLink, Save, Trash2, Settings, Info, ShieldAlert, Building } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { OrganizationGuard } from "@/components/ui/organization-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OrganizationSettingsPage() {
	const params = useParams();
	const router = useRouter();
	const orgId = params.orgId as string;

	const [name, setName] = useState(orgId);
	const [description, setDescription] = useState("");

	return (
		<OrganizationGuard>
			<div className="flex flex-col gap-10 p-6 sm:p-10 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
				{/* Header Section */}
				<header className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[#f8fafc] shadow-lg shadow-indigo-500/20">
							<Building size={24} />
						</div>
						<div className="flex flex-col">
							<h1 className="text-3xl font-extrabold tracking-tight text-[#f8fafc]">Organization Configuration</h1>
							<p className="text-[#94a3b8] font-medium italic">General settings for this entity.</p>
						</div>
					</div>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* Main Forms */}
					<div className="lg:col-span-12 flex flex-col gap-10">
						{/* General Identity */}
						<section className="relative p-8 rounded-[2rem] bg-[#1a1a1a] border border-[#2a2a2a] shadow-xl items-start flex flex-col gap-6">
							<div className="flex flex-col gap-1">
								<h2 className="text-xl font-bold text-[#f8fafc]">General Identity</h2>
								<p className="text-sm text-[#94a3b8]">Baseline metadata for this organization.</p>
							</div>

							<div className="w-full space-y-6">
								<div className="grid gap-2">
									<Label className="text-[#94a3b8] text-xs font-bold uppercase tracking-widest pl-1">Identifier</Label>
									<Input 
										defaultValue={orgId} 
										disabled 
										className="h-12 px-5 bg-[#121212] border-[#2a2a2a] rounded-2xl font-mono text-sm text-[#e5e5e5]" 
									/>
								</div>
								
								<div className="grid gap-2">
									<Label className="text-[#94a3b8] text-xs font-bold uppercase tracking-widest pl-1">Organization Name</Label>
									<Input 
										value={name}
										onChange={(e) => setName(e.target.value)}
										className="h-12 px-5 bg-[#121212] border-[#2a2a2a] rounded-2xl text-sm text-[#e5e5e5] focus:border-indigo-500 outline-none transition-all" 
									/>
								</div>

								<div className="grid gap-2">
									<Label className="text-[#94a3b8] text-xs font-bold uppercase tracking-widest pl-1">Description</Label>
									<Textarea 
										placeholder="e.g. Cognitive research group..."
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										className="min-h-[120px] p-5 bg-[#121212] border-[#2a2a2a] rounded-2xl text-sm text-[#e5e5e5] focus:border-indigo-500 outline-none transition-all"
									/>
								</div>
							</div>

							<Button className="h-11 px-8 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-[#f8fafc] shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-2">
								<Save size={16} />
								Update Settings
							</Button>
						</section>

						{/* Destruction Area */}
						<section className="relative p-8 rounded-[2rem] bg-rose-500/10 border border-rose-900/50 flex flex-col gap-6 overflow-hidden">
							<div className="flex flex-col gap-1 relative">
								<h2 className="text-xl font-bold text-rose-500 flex items-center gap-2">
									<ShieldAlert size={20} />
									Destruction Control
								</h2>
								<p className="text-sm text-rose-400/80 font-medium">Irreversible actions that purge all organization data.</p>
							</div>

							<div className="p-6 rounded-3xl bg-[#121212] border border-[#2a2a2a] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative">
								<div className="flex flex-col gap-0.5 text-center sm:text-left">
									<h4 className="font-bold text-[#f8fafc]">Delete Organization</h4>
									<p className="text-xs text-[#94a3b8] font-medium leading-relaxed">Permanently removes all data, projects, and users.</p>
								</div>
								<Button 
									variant="ghost" 
									className="rounded-xl h-11 px-6 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 font-bold border border-rose-900/50 shrink-0"
									onClick={() => {
										if (confirm("Are you sure you want to permanently delete this organization?")) {
											// Delete logic would go here
										}
									}}
								>
									Terminate Entity
								</Button>
							</div>
						</section>
					</div>
				</div>
			</div>
		</OrganizationGuard>
	);
}
