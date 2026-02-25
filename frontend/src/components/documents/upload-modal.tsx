"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { UploadCloud, Link as LinkIcon, FileText, Globe, Github } from "lucide-react";

// Standard Tab style for premium modals
function PremiumTabs({ options, onChange, value }: { options: { label: string, value: string, icon: React.ElementType }[], onChange: (v: string) => void, value: string }) {
    return (
        <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl border border-border mb-8">
            {options.map((opt) => {
                const Icon = opt.icon;
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            isActive
                                ? "bg-background text-foreground shadow-lg shadow-black/5"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon size={14} className={isActive ? "text-indigo-500" : ""} />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export function UploadModal({ isOpen, onClose, workspaceId, onUploadComplete }: { isOpen: boolean, onClose: () => void, workspaceId?: string, onUploadComplete?: () => void }) {
    const [mode, setMode] = useState("file");
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState("");
    const [branch, setBranch] = useState("main");
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        setLoading(true);
        try {
            const targetWorkspace = workspaceId && workspaceId !== "vault" ? workspaceId : workspaceId!;

            if (mode === "file") {
                if (!file) return;
                await api.uploadDocumentWorkspacesWorkspaceIdUploadPost({
                    workspaceId: targetWorkspace,
                    file
                });
            } else if (mode === "link") {
                if (!url) return;
                if (url.includes('github.com')) {
                    await api.importGithubDocumentWorkspacesWorkspaceIdImportGithubPost({
                        workspaceId: targetWorkspace,
                        gitHubImportRequest: { url, branch }
                    });
                } else if (url.toLowerCase().endsWith('.xml') || url.toLowerCase().includes('sitemap')) {
                    await api.importSitemapDocumentWorkspacesWorkspaceIdImportSitemapPost({
                        workspaceId: targetWorkspace,
                        sitemapImportRequest: { url }
                    });
                } else {
                    await api.importUrlDocumentWorkspacesWorkspaceIdImportUrlPost({
                        workspaceId: targetWorkspace,
                        urlImportRequest: { url }
                    });
                }
            }

            if (onUploadComplete) onUploadComplete();
            onClose();
            setFile(null);
            setUrl("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <UploadCloud size={16} />
                    </div>
                    <span>Add Knowledge Source</span>
                </div>
            )}
            className="max-w-md"
        >
            <div className="pt-2">
                <PremiumTabs
                    value={mode}
                    onChange={setMode}
                    options={[
                        { label: "Local File", value: "file", icon: FileText },
                        { label: "Remote Link", value: "link", icon: Globe },
                    ]}
                />

                <div className="space-y-6">
                    {mode === "file" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 flex items-center justify-center text-indigo-500/40 group-hover:text-indigo-500 transition-colors">
                                    <UploadCloud size={24} />
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-foreground mb-1">
                                        {file ? file.name : "Select or Drop Document"}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                        PDF, DOCX, TXT, MD
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === "link" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Source URL</Label>
                                <Input
                                    className="h-12 rounded-2xl bg-secondary/40 border-border focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="https://documentation.example.com"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                />
                            </div>
                            {url.includes('github.com') && (
                                <div className="space-y-2 animate-in zoom-in-95 duration-200">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Repository Branch</Label>
                                    <div className="relative">
                                        <Github size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="h-12 rounded-2xl bg-secondary/40 border-border pl-12"
                                            value={branch}
                                            onChange={e => setBranch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-10">
                    <button
                        disabled={loading || (mode === 'file' && !file) || (mode === 'link' && !url)}
                        onClick={handleUpload}
                        className="w-full py-4 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale transition-all text-xs font-black tracking-[0.2em] uppercase shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-3"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? "Processing..." : "Ingest Source"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Loader2({ size, className }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
