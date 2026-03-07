"use client";

import React, { useState } from "react";
import {
    GitBranch,
    Settings,
    Layers,
    Cpu,
    Database,
    Zap,
    Info,
    Search,
    ArrowRight,
    Plus,
    Trash2,
    Save,
    Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const ConfigSection = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Icon size={16} />
            </div>
            <h3 className="text-sm font-bold tracking-tight uppercase tracking-[0.1em] text-muted-foreground">{title}</h3>
        </div>
        <div className="pl-8">
            {children}
        </div>
    </div>
);

export default function PipelinesPage() {
    const [activeTab, setActiveTab] = useState("builder");

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Search Pipelines</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Design and deploy custom document search and answer flows.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-10 rounded-xl border-border bg-card gap-2 font-bold text-xs">
                        <Save size={16} />
                        Save Changes
                    </Button>
                    <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                        <Plus size={16} className="mr-2" />
                        New Pipeline
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-secondary/50 p-1 rounded-2xl h-12 mb-8">
                    <TabsTrigger value="builder" className="rounded-xl font-bold text-xs tracking-wide">
                        <Wand2 size={14} className="mr-2" />
                        Strategy Builder
                    </TabsTrigger>
                    <TabsTrigger value="list" className="rounded-xl font-bold text-xs tracking-wide">
                        <Layers size={14} className="mr-2" />
                        Deployed Pipelines
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Sidebar Config */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="bg-card border-border overflow-hidden rounded-3xl">
                                <CardHeader className="border-b border-border bg-secondary/20">
                                    <CardTitle className="text-lg font-bold">Pipeline Designer</CardTitle>
                                    <CardDescription className="text-xs font-medium">Configure the data flow from ingestion to generation.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-12">

                                    {/* Reader & Chunking */}
                                    <ConfigSection title="Data Preparation" icon={Database}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Chunking Strategy</label>
                                                <select className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all">
                                                    <option>Recursive Character</option>
                                                    <option>Semantic Splitting</option>
                                                    <option>Fixed Size Window</option>
                                                    <option>Document-based</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Chunk Size (Tokens)</label>
                                                <input type="number" defaultValue={800} className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    {/* Embedding & Vector Space */}
                                    <ConfigSection title="Vectorization" icon={Zap}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Embedding Provider</label>
                                                <select className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all">
                                                    <option>OpenAI</option>
                                                    <option>Local (HuggingFace)</option>
                                                    <option>Cohere</option>
                                                    <option>Jina AI</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Similarity Metric</label>
                                                <select className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all">
                                                    <option>Cosine Similarity</option>
                                                    <option>Dot Product</option>
                                                    <option>Euclidean (L2)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    {/* Retrieval Strategy */}
                                    <ConfigSection title="Retrieval Engine" icon={Layers}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Search Strategy</label>
                                                <select className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all">
                                                    <option>Basic Vector Search</option>
                                                    <option>Hybrid (Dense + Sparse)</option>
                                                    <option>Graph-Augmented Vector</option>
                                                    <option>Cross-Encoder Reranking</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Recall (Top-K)</label>
                                                <input type="number" defaultValue={20} className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    {/* Generation */}
                                    <ConfigSection title="Output Generation" icon={Cpu}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Model Provider</label>
                                                <select className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all">
                                                    <option>OpenAI (GPT-4o)</option>
                                                    <option>Anthropic (Claude 3.5)</option>
                                                    <option>Groq (Llama 3.1)</option>
                                                    <option>Ollama (Self-Hosted)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Temperature</label>
                                                <input type="number" step="0.1" defaultValue={0.7} className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </ConfigSection>

                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Sidebar Visualization */}
                        <div className="space-y-6">
                            <Card className="bg-indigo-600 border-none shadow-2xl shadow-indigo-600/30 rounded-3xl overflow-hidden text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl" />
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold tracking-tight text-white/90">Visual Pipeline</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8 flex flex-col items-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                            <Search size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Query</span>
                                    </div>

                                    <ArrowRight size={16} className="rotate-90 text-white/20" />

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/40 shadow-xl">
                                            <Layers size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Retrieval</span>
                                    </div>

                                    <ArrowRight size={16} className="rotate-90 text-white/20" />

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                            <Cpu size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Generation</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-border rounded-3xl">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
                                        <Info size={14} className="text-indigo-400" />
                                        Performance Guide
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Cost</p>
                                        <p className="text-xs font-bold text-emerald-500">$0.005 / 1k queries</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Accuracy Rank</p>
                                        <p className="text-xs font-bold text-indigo-400">High (Cross-Encoder)</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Storage Requirement</p>
                                        <p className="text-xs font-bold text-muted-foreground">Approx. 4MB / 1k chunks</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="list" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2].map(i => (
                            <Card key={i} className="bg-card/50 border-border hover:border-indigo-500/40 transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-bold">Standard Hybrid Pipeline</CardTitle>
                                        <Zap size={16} className="text-indigo-400 fill-indigo-400" />
                                    </div>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-wider">pipe_x72jk192</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-muted-foreground font-medium">Default pipeline using GPT-4o-mini and text-embedding-3-small.</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-[10px] font-bold tracking-wide">EDIT</Button>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg text-red-500 border-red-500/20 hover:bg-red-500/10">
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
