"use client";

import React, { useState } from "react";
import {
    Cpu,
    Layers,
    Sparkles,
    Check,
    Plus,
    Zap,
    Download,
    Trash2,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ModelCard = ({ name, provider, status, isDefault, type }: any) => (
    <Card className="bg-card/50 border-border hover:border-indigo-500/30 transition-all group">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold tracking-tight">{name}</CardTitle>
                    {isDefault && <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Default</span>}
                </div>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{provider}</CardDescription>
            </div>
            <div className={`p-2 rounded-lg ${status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {status === 'ready' ? <Check size={14} /> : <AlertCircle size={14} />}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Type</p>
                    <p className="text-[10px] font-bold tracking-tight">{type}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Status</p>
                    <p className="text-[10px] font-bold tracking-tight uppercase text-emerald-500">{status}</p>
                </div>
            </div>
            <div className="flex gap-2">
                {!isDefault && <Button variant="outline" size="sm" className="flex-1 h-7 rounded-lg text-[9px] font-bold uppercase tracking-wider">Set Default</Button>}
                <Button variant="outline" size="sm" className={`h-7 rounded-lg text-[9px] font-bold uppercase tracking-wider ${isDefault ? 'flex-1' : 'w-7 px-0'} text-red-500 border-red-500/20 hover:bg-red-500/10`}>
                    <Trash2 size={12} />
                </Button>
            </div>
        </CardContent>
    </Card>
);

export default function ModelsPage() {
    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Model Registry</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Manage and configure AI models for generation, embedding, and reranking.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                        <Plus size={16} className="mr-2" />
                        Add Model
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="generation" className="w-full">
                <TabsList className="flex bg-transparent border-b border-border rounded-none h-12 mb-8 gap-8 px-0">
                    <TabsTrigger value="generation" className="bg-transparent border-none p-0 h-full rounded-none data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-400 font-bold text-xs uppercase tracking-widest transition-all">
                        <Sparkles size={14} className="mr-2" />
                        Generation LLMs
                    </TabsTrigger>
                    <TabsTrigger value="embedding" className="bg-transparent border-none p-0 h-full rounded-none data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-400 font-bold text-xs uppercase tracking-widest transition-all">
                        <Layers size={14} className="mr-2" />
                        Embedding Models
                    </TabsTrigger>
                    <TabsTrigger value="rerank" className="bg-transparent border-none p-0 h-full rounded-none data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-400 font-bold text-xs uppercase tracking-widest transition-all">
                        <Zap size={14} className="mr-2" />
                        Rerank Models
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="generation" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ModelCard name="gpt-4o" provider="OpenAI" status="ready" isDefault type="LLM" />
                    <ModelCard name="claude-3-5-sonnet" provider="Anthropic" status="ready" type="LLM" />
                    <ModelCard name="llama-3.1-70b" provider="Groq" status="ready" type="LLM" />
                    <ModelCard name="mistral-large" provider="Mistral" status="ready" type="LLM" />
                </TabsContent>

                <TabsContent value="embedding" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ModelCard name="text-embedding-3-small" provider="OpenAI" status="ready" isDefault type="Sparse/Dense" />
                    <ModelCard name="text-embedding-v3" provider="Jina AI" status="ready" type="Dense" />
                    <ModelCard name="bge-large-en-v1.5" provider="Local (HuggingFace)" status="ready" type="Local Dense" />
                </TabsContent>

                <TabsContent value="rerank" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ModelCard name="rerank-english-v3.0" provider="Cohere" status="ready" isDefault type="Cross-Encoder" />
                    <ModelCard name="bge-reranker-v2-m3" provider="Local (HuggingFace)" status="ready" type="Local Rerank" />
                </TabsContent>
            </Tabs>

            {/* Local Model Download Section */}
            <Card className="bg-indigo-600/5 border border-indigo-500/20 rounded-3xl overflow-hidden mt-12 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Cpu size={120} />
                </div>
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Download size={20} className="text-indigo-400" />
                        Download Local Models
                    </CardTitle>
                    <CardDescription className="font-medium">Run high-performance open-source models directly on your Karag infrastructure.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 relative z-10">
                    {[
                        { name: "Llama 3.1 8B", size: "4.7 GB", description: "Ollama optimized" },
                        { name: "Nomad Embed", size: "1.2 GB", description: "CPU Optimized Embedding" },
                        { name: "BGE Reranker", size: "800 MB", description: "Precision Reranking" }
                    ].map((model) => (
                        <div key={model.name} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between group hover:border-indigo-500/40 transition-all cursor-pointer">
                            <div>
                                <p className="text-sm font-bold tracking-tight">{model.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">{model.size} • {model.description}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Download size={14} />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
