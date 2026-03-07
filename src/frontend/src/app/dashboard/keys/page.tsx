"use client";

import React, { useState } from "react";
import {
    Key,
    Plus,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    Clock,
    Zap,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/context/toast-context";

const KeyRow = ({ name, value, lastUsed }: any) => {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    const maskKey = (key: string) => {
        if (visible) return key;
        return `${key.slice(0, 8)}************************`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("API Key copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl hover:bg-secondary/30 transition-colors border border-transparent hover:border-border group">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
                    <Key size={18} />
                </div>
                <div>
                    <p className="text-sm font-bold tracking-tight">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border">
                            {maskKey(value)}
                        </span>
                        <button onClick={() => setVisible(!visible)} className="text-muted-foreground hover:text-indigo-400 p-1">
                            {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right flex items-center gap-2">
                    <Clock size={12} className="text-muted-foreground" />
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Last Used</p>
                        <p className="text-[10px] font-bold">{lastUsed}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10"
                    >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default function KeysPage() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Securely access the KARAG BaaS platform via REST API and SDKs.</p>
                </div>
                <Button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] tracking-wide shadow-lg shadow-indigo-600/20">
                    <Plus size={16} className="mr-2" />
                    Create New Key
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 bg-card/50 border-border rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-border bg-secondary/20">
                        <CardTitle className="text-lg font-bold">Your API Keys</CardTitle>
                        <CardDescription className="text-xs font-medium">Keep these keys private. They grant full access to your workspace resources.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 divide-y divide-border">
                        <KeyRow name="Production Integration" value="kg_live_492jk91mf0s82j190v" lastUsed="2 minutes ago" />
                        <KeyRow name="Staging/Dev Env" value="kg_test_921nmas2091mjs021" lastUsed="Never" />
                        <KeyRow name="Local Script Access" value="kg_local_01mjs9210sm291m" lastUsed="1 day ago" />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-indigo-600 border-none shadow-2xl shadow-indigo-600/30 rounded-3xl overflow-hidden text-white relative">
                        <CardHeader>
                            <Zap size={24} className="mb-2 text-white fill-white" />
                            <CardTitle className="text-sm font-bold tracking-tight">Quick Connect</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs font-medium text-white/80 leading-relaxed italic">
                                "Simply pass the API Key in the X-API-KEY header to authenticate your requests."
                            </p>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/10 font-mono text-[9px] break-all leading-relaxed">
                                curl -X GET "https://karag.io/api/v1/search" \<br />
                                &nbsp;&nbsp;-H "X-API-KEY: YOUR_KEY"
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border rounded-3xl">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold tracking-tight">Security Best Practices</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="text-[10px] font-bold text-muted-foreground space-y-3">
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                    Never commit keys to version control.
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                    Rotate keys periodically for security.
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                    Use specific keys for separate environments.
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
