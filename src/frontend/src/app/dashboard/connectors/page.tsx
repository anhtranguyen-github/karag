"use client";

import React from "react";
import {
    Plug,
    ExternalLink,
    CheckCircle2,
    Plus,
    Cloud,
    Database,
    Github,
    Globe,
    Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ConnectorCard = ({ name, icon: Icon, description, status, category }: any) => (
    <Card className="bg-card/50 border-border hover:border-indigo-500/30 transition-all group cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="p-3 rounded-2xl bg-secondary group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-all duration-500">
                <Icon size={24} />
            </div>
            {status === 'connected' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Connected</span>
                </div>
            )}
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight group-hover:text-indigo-400 transition-colors">{name}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{category}</p>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed flex-1">
                {description}
            </p>
            <div className="pt-4 mt-auto">
                <Button variant="outline" className="w-full h-9 rounded-xl font-bold text-[10px] tracking-widest uppercase gap-2 hover:bg-secondary">
                    {status === 'connected' ? "Manage" : "Connect"}
                    {status === 'connected' ? <Settings size={12} /> : <ExternalLink size={12} />}
                </Button>
            </div>
        </CardContent>
    </Card>
);

export default function ConnectorsPage() {
    const connectors = [
        { name: "S3 Bucket", icon: Cloud, category: "Storage", description: "Sync documents from Amazon S3 bucket with auto-polling.", status: "connected" },
        { name: "MinIO", icon: Database, category: "Storage", description: "Local self-hosted object storage integration.", status: "connected" },
        { name: "Web Crawler", icon: Globe, category: "Utility", description: "Ingest content from websites via sitemaps or URL crawling." },
        { name: "GitHub", icon: Github, category: "Developer", description: "Import repositories, markdown docs, and code snippets." },
        { name: "Notion", icon: Globe, category: "Productivity", description: "Sync your Notion workspace databases and pages." },
        { name: "Google Drive", icon: Cloud, category: "Productivity", description: "Sync PDF, Word, and Excel files from Google Drive folder." },
        { name: "Qdrant", icon: Database, category: "Vector Store", description: "Advanced vector database connectivity and inspection.", status: "connected" },
        { name: "Neo4j", icon: GitBranch, category: "Graph DB", description: "Knowledge graph storage for relational RAG pipelines.", status: "connected" },
    ];

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Connectors</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Link external data sources and infrastructure to your RAG environment.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                        <Plus size={16} className="mr-2" />
                        Add Source
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {connectors.map((connector) => (
                    <ConnectorCard key={connector.name} {...connector} />
                ))}
            </div>
        </div>
    );
}

function GitBranch({ size = 16, ...props }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
    );
}
