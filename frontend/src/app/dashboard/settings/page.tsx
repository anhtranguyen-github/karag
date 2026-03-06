"use client";

import React from "react";
import {
    Settings,
    User,
    Bell,
    Shield,
    Database,
    Globe,
    CreditCard,
    CheckCircle2,
    Trash2,
    Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const SettingsRow = ({ title, description, children }: any) => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl hover:bg-secondary/30 transition-colors border border-transparent hover:border-border group">
        <div className="flex-1">
            <h4 className="text-sm font-bold tracking-tight">{title}</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{description}</p>
        </div>
        <div className="shrink-0">
            {children}
        </div>
    </div>
);

export default function SettingsPage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Manage your workspace configuration and personal preferences.</p>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Workspace Info */}
                <Card className="bg-card/50 border-border rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-border bg-secondary/20">
                        <div className="flex items-center gap-2">
                            <Layout size={18} className="text-indigo-400" />
                            <CardTitle className="text-lg font-bold">Workspace Configuration</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Workspace Name</label>
                                <Input defaultValue="Main Production Environment" className="h-11 rounded-xl bg-secondary border-border font-medium" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Environment ID</label>
                                <Input disabled value="ws_prod_92jk128" className="h-11 rounded-xl bg-secondary/50 border-border font-mono text-xs cursor-not-allowed" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Description</label>
                            <textarea className="w-full h-24 bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all resize-none" defaultValue="Primary workspace for all company documents and internal RAG operations." />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <div className="space-y-6">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <Settings size={14} />
                        System Preferences
                    </h3>
                    <Card className="bg-card/50 border-border rounded-3xl overflow-hidden divide-y divide-border">
                        <SettingsRow title="Advanced Reasoning" description="Enable multi-step planning and reflection for complex queries.">
                            <Switch defaultChecked />
                        </SettingsRow>
                        <SettingsRow title="Automatic Sync" description="Periodically poll connected data sources for new documents.">
                            <Switch defaultChecked />
                        </SettingsRow>
                        <SettingsRow title="Detailed Tracing" description="Capture full internal traces for RAG operations (impacts latency slightly).">
                            <Switch defaultChecked />
                        </SettingsRow>
                        <SettingsRow title="Public API Access" description="Allow external requests via API keys to this workspace.">
                            <Switch defaultChecked />
                        </SettingsRow>
                    </Card>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-12">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <Shield size={14} />
                        Danger Zone
                    </h3>
                    <Card className="border-red-500/20 bg-red-500/[0.02] rounded-3xl overflow-hidden p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center md:text-left">
                                <h4 className="text-sm font-bold tracking-tight text-red-500">Purge Vector Database</h4>
                                <p className="text-xs text-muted-foreground font-medium max-w-sm">This will permanently delete all indexed chunks for this workspace. This action cannot be undone.</p>
                            </div>
                            <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold text-xs px-6 h-10 rounded-xl">
                                Purge Database
                            </Button>
                        </div>
                        <div className="my-6 border-t border-red-500/10" />
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center md:text-left">
                                <h4 className="text-sm font-bold tracking-tight text-red-500">Delete Workspace</h4>
                                <p className="text-xs text-muted-foreground font-medium max-w-sm">Permanently remove this workspace and all associated data, configurations, and API keys.</p>
                            </div>
                            <Button className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-6 h-10 rounded-xl">
                                Delete Permanently
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
