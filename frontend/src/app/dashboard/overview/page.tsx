"use client";

import React from "react";
import {
    Database,
    FileText,
    Layers,
    Activity,
    Clock,
    Zap,
    Search,
    ArrowUpRight,
    Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, description, trend }: any) => (
    <Card className="bg-card/50 border-border hover:border-indigo-500/30 transition-all duration-300 group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">{title}</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/50 text-muted-foreground group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
                <Icon size={16} />
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <div className="flex items-center gap-2 mt-1">
                {trend && (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        +{trend}%
                    </span>
                )}
                <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
            </div>
        </CardContent>
    </Card>
);

export default function OverviewPage() {
    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Monitoring your RAG infrastructure in real-time.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-[11px] tracking-wide">
                        View Docs
                    </Button>
                    <Button size="sm" className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                        <Plus size={14} className="mr-2" />
                        New Dataset
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Datasets"
                    value="12"
                    icon={Database}
                    description="Across your workspace"
                    trend={12}
                />
                <StatCard
                    title="Documents"
                    value="1,248"
                    icon={FileText}
                    description="Ingested chunks"
                />
                <StatCard
                    title="Avg Latency"
                    value="245ms"
                    icon={Activity}
                    description="Search response time"
                />
                <StatCard
                    title="Uptime"
                    value="99.9%"
                    icon={Zap}
                    description="Infrastructure health"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2 bg-card/50 border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold tracking-tight">Recent Search Traces</CardTitle>
                        <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 tracking-wider">
                            View All Traces
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground">
                                            <Search size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold tracking-tight line-clamp-1">"How does the FSRS algorithm handle initial reviews?"</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                                    <Clock size={10} />
                                                    2 mins ago
                                                </span>
                                                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-400/10 px-1.5 py-0.5 rounded">
                                                    Vector + Graph
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div className="hidden md:block">
                                            <p className="text-xs font-bold font-mono">0.92 score</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">3 sources</p>
                                        </div>
                                        <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* System Health / Model Config */}
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-tight">Active Models</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Generation</p>
                                <div className="p-3 rounded-xl bg-indigo-600/5 border border-indigo-500/20 flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-400">gpt-4o-mini</span>
                                    <Zap size={12} className="text-indigo-400 fill-indigo-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Embedding</p>
                                <div className="p-3 rounded-xl bg-emerald-600/5 border border-emerald-500/20 flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-400">text-embedding-3-small</span>
                                    <Layers size={12} className="text-emerald-400 fill-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Qdrant Nodes</span>
                                    <span className="text-[10px] font-bold text-emerald-500">HEALTHY</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Neo4j Service</span>
                                    <span className="text-[10px] font-bold text-emerald-500">STABLE</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">MinIO Object Store</span>
                                    <span className="text-[10px] font-bold text-emerald-500">CONNECTED</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
