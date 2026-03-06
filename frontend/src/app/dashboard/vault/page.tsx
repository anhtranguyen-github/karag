"use client";

import React, { useState } from "react";
import {
    FileText,
    Upload,
    Search,
    MoreVertical,
    Download,
    Share2,
    Trash2,
    Eye,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

export default function VaultPage() {
    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Global Vault</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Shared secure storage for all raw documents across workspaces.</p>
                </div>
                <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                    <Upload size={16} className="mr-2" />
                    Upload Files
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                <Input
                    placeholder="Search documents in vault by name, type or content..."
                    className="w-full h-12 pl-12 pr-6 rounded-2xl bg-card border border-border focus:border-indigo-500/30 transition-all font-medium"
                />
            </div>

            {/* File Table / Grid */}
            <Card className="bg-card/50 border-border rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="grid grid-cols-12 px-6 py-4 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        <div className="col-span-6">Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-border">
                        {[
                            { name: "2508.15260v1.pdf", type: "PDF", size: "5.6 MB" },
                            { name: "karag_architecture.md", type: "Markdown", size: "24 KB" },
                            { name: "dataset_sample.json", type: "JSON", size: "1.2 MB" },
                            { name: "research_notes.docx", type: "Document", size: "480 KB" },
                        ].map((file) => (
                            <div key={file.name} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-secondary/30 transition-colors group cursor-pointer">
                                <div className="col-span-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold tracking-tight truncate group-hover:text-indigo-400 transition-colors">{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Modified 2 days ago</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-secondary border border-border">{file.type}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs font-medium text-muted-foreground">{file.size}</span>
                                </div>
                                <div className="col-span-2 flex justify-end items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:bg-secondary">
                                        <Eye size={14} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 rounded-lg text-indigo-400 font-bold text-[10px] gap-1 hover:bg-indigo-500/10">
                                        IMPORT
                                        <ArrowRight size={10} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground">
                                        <MoreVertical size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Storage Quota */}
            <div className="flex justify-between items-center py-4 px-6 rounded-3xl bg-secondary/20 border border-border">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-2 h-12 bg-indigo-500 rounded-full" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vault Usage</p>
                        <p className="text-lg font-bold tracking-tight">12.4 GB / 50 GB</p>
                    </div>
                </div>
                <Button variant="outline" className="rounded-xl border-border bg-card font-bold text-xs">
                    Manage Storage
                </Button>
            </div>
        </div>
    );
}
