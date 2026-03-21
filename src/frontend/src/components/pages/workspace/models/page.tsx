"use client";

import React, { useMemo, useState } from "react";
import {
Search,
Cpu,
Globe,
Database,
Layers,
Zap,
Box,
ListFilter,
} from "lucide-react";
import { useTenant } from "@/providers/tenant-provider";
import { useRuntimeModels } from "@/hooks/useRuntimeModels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { SelectDropdown } from "@/components/inputs/select-dropdown";

function providerAccentClass(provider: string): string {
if (provider === "omniroute") return "bg-orange-400";
if (provider === "ollama") return "bg-blue-500";
if (provider === "vllm" || provider === "hf") return "bg-purple-500";
return "bg-slate-500";
}

export default function WorkspaceModelsPage() {
const { tenant } = useTenant();
const runtime = useRuntimeModels();

const [search, setSearch] = useState("");
const [activeType, setActiveType] = useState<string>("all");
const [activeProvider, setActiveProvider] = useState<string>("all");

const allModels = useMemo(() => {
const list: Array<{ provider: string; name: string; type: string }> = [];
if (runtime.data) {
for (const entry of runtime.data) {
for (const model of entry.models) {
list.push({ provider: entry.provider, name: model, type: entry.kind });
}
}
}
return list;
}, [runtime.data]);

const filteredModels = useMemo(() => {
return allModels.filter((m) => {
const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
m.provider.toLowerCase().includes(search.toLowerCase());
const matchesType = activeType === "all" || m.type === activeType;
const matchesProvider = activeProvider === "all" || m.provider === activeProvider;
return matchesSearch && matchesType && matchesProvider;
});
}, [allModels, search, activeType, activeProvider]);

const providers = useMemo(() => {
const p = new Set<string>();
allModels.forEach(m => p.add(m.provider));
return Array.from(p).sort((a, b) => a.localeCompare(b));
}, [allModels]);

const providerOptions = useMemo(() => [
{ label: "All Providers", value: "all" },
...providers.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))
], [providers]);

const stats = useMemo(() => ({
total: allModels.length,
llm: allModels.filter(m => m.type === "llm").length,
embedding: allModels.filter(m => m.type === "embedding").length,
providers: providers.length
}), [allModels, providers]);

return (
<WorkspaceGuard>
<div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
<PageHeader
eyebrow="Runtime"
title="Available Models"
description="LLM, embedding, and reranking models detected from your configured providers."
/>
<div className="flex items-center gap-3">
<Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 py-1 px-3">
<Zap className="w-3 h-3 mr-1" /> OmniRoute Active
</Badge>
<Badge variant="outline" className="bg-orange-400/10 text-orange-400 border-orange-400/20 py-1 px-3">
<Box className="w-3 h-3 mr-1" /> Runtime
</Badge>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{[
{ label: "Total Models", value: stats.total, icon: Globe, color: "blue" },
{ label: "LLM Engines", value: stats.llm, icon: Cpu, color: "emerald" },
{ label: "Embedders", value: stats.embedding, icon: Layers, color: "purple" },
{ label: "Providers", value: stats.providers, icon: Database, color: "amber" },
].map(({ label, value, icon: Icon, color }) => (
<Card key={label} className="bg-[#18181b] border-slate-800">
<CardContent className="p-4 flex items-center gap-4">
<div className={cn("p-2 rounded-lg", `bg-${color}-500/10 text-${color}-500`)}>
<Icon className="w-5 h-5" />
</div>
<div>
<div className="text-2xl font-bold text-[#e5e5e5]">{value}</div>
<div className="text-xs text-slate-400">{label}</div>
</div>
</CardContent>
</Card>
))}
</div>

<div className="flex flex-col gap-6">
<div className="flex flex-col gap-4 bg-[#1c1c21] p-6 rounded-2xl border border-slate-800/60 shadow-xl">
<div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
<div className="relative w-full sm:w-80">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
<Input
placeholder="Search model name, provider..."
className="pl-9 bg-[#121217] border-slate-800 text-[#e5e5e5] placeholder:text-slate-600 focus:ring-blue-500/40 h-11"
value={search}
onChange={e => setSearch(e.target.value)}
/>
</div>

<div className="flex flex-wrap gap-4 items-center">
<div className="flex items-center gap-3 bg-[#121217] p-1 rounded-xl border border-slate-800">
{["all", "llm", "embedding"].map(t => (
<Button
key={t}
variant="ghost"
size="sm"
className={cn("text-xs px-4 h-8", activeType === t ? "bg-slate-800 text-[#e5e5e5]" : "text-slate-500")}
onClick={() => setActiveType(t)}
>
{t === "all" ? "All Types" : t === "llm" ? "LLMs" : "Embeddings"}
</Button>
))}
</div>
<div className="flex items-center gap-2">
<ListFilter className="w-4 h-4 text-slate-500" />
<SelectDropdown
label=""
options={providerOptions}
value={activeProvider}
onChange={(e) => setActiveProvider(e.target.value)}
className="w-48 bg-[#121217] border-slate-800 text-slate-300 h-9"
/>
</div>
</div>
</div>
<div className="text-xs text-slate-500 font-medium">
Showing <span className="text-[#e5e5e5] font-bold">{filteredModels.length}</span> models
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{filteredModels.length > 0 ? (
filteredModels.map((model) => (
<Card key={model.name} className="group overflow-hidden bg-[#1c1c21] border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/40">
<div className={cn("h-1.5 w-full", providerAccentClass(model.provider))} />
<CardHeader className="pb-3">
<div className="flex flex-col gap-1">
<span className="text-xs font-bold uppercase tracking-widest text-slate-500">{model.provider}</span>
<CardTitle className="text-lg text-[#e5e5e5] font-semibold truncate group-hover:text-blue-400 transition-colors" title={model.name}>
{model.name}
</CardTitle>
</div>
</CardHeader>
<CardContent className="pb-4">
<Badge variant="outline" className="rounded-xl border-slate-800 bg-slate-900/50 text-slate-400 text-[10px] font-medium py-0">
{model.type.toUpperCase()}
</Badge>
</CardContent>
</Card>
))
) : (
<div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-[#1c1c21] rounded-2xl border border-dashed border-slate-800">
<div className="p-4 rounded-full bg-slate-900 shadow-inner">
<Search className="w-10 h-10 text-slate-700" />
</div>
<div>
<h3 className="text-lg font-semibold text-[#e5e5e5]">No models found</h3>
<p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
Try adjusting your search or filter criteria.
</p>
</div>
<Button variant="outline" className="mt-2 border-slate-700 hover:bg-slate-800 text-slate-300" onClick={() => { setSearch(""); setActiveType("all"); setActiveProvider("all"); }}>
Clear all filters
</Button>
</div>
)}
</div>
</div>
</div>
</WorkspaceGuard>
);
}
