"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { WorkspaceCreate } from "@/lib/api";
import { Settings, Sparkles, Layout, Info, AlertCircle, ChevronDown, Loader2 } from "lucide-react";

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingMetadata {
    mutable: boolean;
    category: string;
    description: string;
    options?: string[];
}

export function CreateWorkspaceModal({
    isOpen,
    onClose,
}: CreateWorkspaceModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<Record<string, SettingMetadata>>({});
    const [formData, setFormData] = useState<Partial<WorkspaceCreate>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            api
                .getSettingsMetadataSettingsMetadataGet()
                .then((data: any) => {
                    setMetadata(data.data as Record<string, SettingMetadata>);
                })
                .catch((err: any) => console.error("Failed to fetch settings metadata", err));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.name) {
                throw new Error("Workspace name is required");
            }

            await api.createWorkspaceWorkspacesPost({
                workspaceCreate: {
                    name: formData.name,
                    description: formData.description,
                    ...formData
                } as WorkspaceCreate,
            });

            onClose();
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create workspace");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const dynamicFields = Object.entries(metadata).filter(([key]) => {
        return key !== 'name' && key !== 'description';
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Workspace">
            <form onSubmit={handleSubmit} className="flex flex-col max-w-md mx-auto">
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* General Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b">
                            <Layout className="w-3 h-3" />
                            General Information
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Workspace Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Research Project, Legal Vault..."
                                value={formData.name || ""}
                                onChange={(e) => handleChange("name", e.target.value)}
                                disabled={loading}
                                required
                                className="h-11 bg-muted/20 border-muted-foreground/10 focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <textarea
                                id="description"
                                placeholder="What is this workspace for? (Optional)"
                                rows={3}
                                className="flex w-full rounded-xl border border-muted-foreground/10 bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 resize-none"
                                value={formData.description || ""}
                                onChange={(e) => handleChange("description", e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* AI Configuration Section */}
                    {dynamicFields.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b">
                                <Sparkles className="w-3 h-3" />
                                AI Engine Strategy
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {dynamicFields.map(([key, meta]) => {
                                    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                                    const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                    if (meta.options && meta.options.length > 0) {
                                        return (
                                            <div key={key} className="space-y-2">
                                                <Label htmlFor={key} className="text-xs font-semibold text-muted-foreground">
                                                    {displayName}
                                                </Label>
                                                <div className="relative">
                                                    <select
                                                        id={key}
                                                        className="appearance-none flex h-10 w-full rounded-lg border border-muted-foreground/10 bg-muted/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
                                                        value={formData[camelKey as keyof WorkspaceCreate] as string || ""}
                                                        onChange={(e) => handleChange(camelKey, e.target.value)}
                                                        disabled={loading}
                                                    >
                                                        <option value="">Default (Auto)</option>
                                                        {meta.options.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })}
                            </div>

                            <div className="bg-primary/5 rounded-lg p-3 flex gap-3 items-start">
                                <Info className="w-4 h-4 text-primary mt-0.5" />
                                <p className="text-[11px] text-primary/80 leading-relaxed">
                                    These settings define which LLM and Embedding models will be used for this workspace's RAG pipeline.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-10">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] rounded-xl shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Setting up...
                            </>
                        ) : "Launch Workspace"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
