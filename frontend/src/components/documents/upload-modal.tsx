"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { UploadCloud, Link as LinkIcon, Github, FileAudio } from "lucide-react";

// Simple Tabs implementation since we don't have ui/tabs yet
function SimpleTabs({ options, onChange, value }: { options: { label: string, value: string, icon?: React.ElementType }[], onChange: (v: string) => void, value: string }) {
    return (
        <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-4 overflow-x-auto">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                        value === opt.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                >
                    {opt.icon && <opt.icon className="w-4 h-4 mr-2" />}
                    {opt.label}
                </button>
            ))}
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
            const targetWorkspace = workspaceId || "vault";

            if (mode === "file") {
                if (!file) return;
                await api.uploadDocumentUploadPost({ file, workspaceId: targetWorkspace });
            } else if (mode === "link") {
                if (!url) return;
                if (url.includes('github.com')) {
                    await api.importGithubDocumentImportGithubPost({ gitHubImportRequest: { url, branch }, workspaceId: targetWorkspace });
                } else if (url.toLowerCase().endsWith('.xml') || url.toLowerCase().includes('sitemap')) {
                    await api.importSitemapDocumentImportSitemapPost({ sitemapImportRequest: { url }, workspaceId: targetWorkspace });
                } else {
                    await api.importUrlDocumentImportUrlPost({ urlImportRequest: { url }, workspaceId: targetWorkspace });
                }
            }

            if (onUploadComplete) onUploadComplete();
            onClose();
            // Reset state
            setFile(null);
            setUrl("");
        } catch (e) {
            console.error(e);
            alert("Upload failed. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Document">
            <div className="py-2">
                <SimpleTabs
                    value={mode}
                    onChange={setMode}
                    options={[
                        { label: "File", value: "file", icon: UploadCloud },
                        { label: "Link", value: "link", icon: LinkIcon },
                    ]}
                />

                <div className="space-y-4">
                    {mode === "file" && (
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="file">Document</Label>
                            <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD supported.</p>
                        </div>
                    )}
                    {mode === "link" && (
                        <>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="url">URL</Label>
                                <Input id="url" type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
                            </div>
                            {url.includes('github.com') && (
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="branch">Branch</Label>
                                    <Input id="branch" type="text" value={branch} onChange={e => setBranch(e.target.value)} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={handleUpload} disabled={loading}>{loading ? "Uploading..." : "Import"}</Button>
                </div>
            </div>
        </Modal>
    );
}
