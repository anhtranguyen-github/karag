"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { WorkspaceCreate } from "@/lib/api";
import {
    Sparkles, Layout, Info, AlertCircle, ChevronDown, Loader2,
    Boxes, Search, GitFork, Cpu, FileText, Wand2, RotateCcw
} from "lucide-react";

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingMetadata {
    mutable: boolean;
    category: string;
    description: string;
    field_type: "select" | "bool" | "int" | "float" | "text";
    options?: string[];
    default?: any;
    min?: number;
    max?: number;
    step?: number;
}

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    "Ingestion Node": { label: "Chunking", color: "text-cyan-400", icon: FileText },
    "Embedding Node": { label: "Embeddings", color: "text-indigo-400", icon: Boxes },
    "Generation Node": { label: "Generation", color: "text-violet-400", icon: Wand2 },
    "Retrieval Node": { label: "Retrieval", color: "text-emerald-400", icon: Search },
    "Graph Node": { label: "Knowledge Graph", color: "text-amber-400", icon: GitFork },
    "Reranking Node": { label: "Reranking", color: "text-rose-400", icon: RotateCcw },
    "Agentic Node": { label: "Agent Behavior", color: "text-fuchsia-400", icon: Cpu },
};

// Order of categories in the UI
const CATEGORY_ORDER = [
    "Ingestion Node",
    "Embedding Node",
    "Generation Node",
    "Retrieval Node",
    "Graph Node",
    "Reranking Node",
    "Agentic Node",
];

// Fields to hide from the create modal UI (backend-only or too advanced)
const HIDDEN_FIELDS = new Set([
    "show_reasoning", "system_prompt", "job_concurrency",
    "retrieval_timeout", "agent_tool_limit",
]);

export function CreateWorkspaceModal({
    isOpen,
    onClose,
}: CreateWorkspaceModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<Record<string, SettingMetadata>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
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

    // Filter out name/description/hidden fields and group remaining by category
    const dynamicFields = useMemo(() => {
        return Object.entries(metadata).filter(([key]) => {
            return key !== 'name' && key !== 'description' && !HIDDEN_FIELDS.has(key);
        });
    }, [metadata]);

    const groupedByCategory = useMemo(() => {
        const groups: Record<string, [string, SettingMetadata][]> = {};
        for (const [key, meta] of dynamicFields) {
            const cat = meta.category || "Other";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push([key, meta]);
        }
        return groups;
    }, [dynamicFields]);

    const visibleCategories = useMemo(() => {
        return CATEGORY_ORDER.filter(cat => {
            const fields = groupedByCategory[cat];
            return fields && fields.length > 0;
        });
    }, [groupedByCategory]);

    const renderField = (key: string, meta: SettingMetadata) => {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const currentValue = formData[camelKey];

        // Select (dropdown)
        if (meta.field_type === "select" && meta.options) {
            return (
                <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-[11px] font-semibold text-muted-foreground">
                            {displayName}
                        </Label>
                        {meta.description && (
                            <span className="text-[9px] text-muted-foreground/50 max-w-[140px] truncate" title={meta.description}>
                                {meta.description}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <select
                            id={key}
                            className="appearance-none flex h-8 w-full rounded-lg border border-muted-foreground/10 bg-muted/20 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
                            value={(currentValue as string) ?? ""}
                            onChange={(e) => handleChange(camelKey, e.target.value)}
                            disabled={loading}
                        >
                            <option value="">{meta.default ?? "Auto"}</option>
                            {meta.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            );
        }

        // Boolean (toggle)
        if (meta.field_type === "bool") {
            const checked = currentValue !== undefined ? currentValue : meta.default ?? false;
            return (
                <div key={key} className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                        <Label htmlFor={key} className="text-[11px] font-semibold text-muted-foreground cursor-pointer">
                            {displayName}
                        </Label>
                        {meta.description && (
                            <span className="text-[9px] text-muted-foreground/50">{meta.description}</span>
                        )}
                    </div>
                    <button
                        type="button"
                        id={key}
                        role="switch"
                        aria-checked={checked}
                        onClick={() => handleChange(camelKey, !checked)}
                        disabled={loading}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted-foreground/20'
                            }`}
                    >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                    </button>
                </div>
            );
        }

        // Number (int or float)
        if (meta.field_type === "int" || meta.field_type === "float") {
            const val = currentValue !== undefined ? currentValue : "";
            return (
                <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-[11px] font-semibold text-muted-foreground">
                            {displayName}
                        </Label>
                        <span className="text-[9px] text-muted-foreground/40 font-mono">
                            {meta.min !== undefined && meta.max !== undefined
                                ? `${meta.min} – ${meta.max}`
                                : meta.description || ""}
                        </span>
                    </div>
                    <input
                        type="number"
                        id={key}
                        className="flex h-8 w-full rounded-lg border border-muted-foreground/10 bg-muted/20 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={val}
                        placeholder={meta.default !== undefined ? String(meta.default) : ""}
                        min={meta.min}
                        max={meta.max}
                        step={meta.step ?? (meta.field_type === "float" ? 0.05 : 1)}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                                handleChange(camelKey, undefined);
                            } else {
                                handleChange(camelKey, meta.field_type === "float" ? parseFloat(raw) : parseInt(raw, 10));
                            }
                        }}
                        disabled={loading}
                    />
                </div>
            );
        }

        // Text
        if (meta.field_type === "text") {
            return (
                <div key={key} className="space-y-1">
                    <Label htmlFor={key} className="text-[11px] font-semibold text-muted-foreground">
                        {displayName}
                    </Label>
                    <input
                        type="text"
                        id={key}
                        className="flex h-8 w-full rounded-lg border border-muted-foreground/10 bg-muted/20 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={(currentValue as string) ?? ""}
                        placeholder={meta.default ?? ""}
                        onChange={(e) => handleChange(camelKey, e.target.value)}
                        disabled={loading}
                    />
                </div>
            );
        }

        return null;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Workspace" className="max-w-4xl">
            <form onSubmit={handleSubmit} className="flex flex-col w-full">
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* General Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b">
                            <Layout className="w-3 h-3" />
                            General Information
                        </div>

                        <div className="space-y-4">
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
                                    rows={4}
                                    className="flex w-full rounded-xl border border-muted-foreground/10 bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 resize-none"
                                    value={formData.description || ""}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-lg p-3 flex gap-3 items-start border border-primary/10">
                            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-[11px] text-primary/80 leading-relaxed">
                                Immutable settings (marked with lock icon) are fixed after workspace creation.
                                All other settings can be adjusted later.
                            </p>
                        </div>
                    </div>

                    {/* AI Configuration Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b">
                            <Sparkles className="w-3 h-3" />
                            AI Engine Strategy
                        </div>

                        {visibleCategories.length > 0 ? (
                            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                {visibleCategories.map((cat) => {
                                    const config = CATEGORY_CONFIG[cat];
                                    const fields = groupedByCategory[cat] || [];
                                    const Icon = config?.icon || Sparkles;

                                    return (
                                        <details key={cat} className="group" open>
                                            <summary className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider cursor-pointer select-none py-2 ${config?.color || 'text-muted-foreground'} hover:opacity-80 transition-opacity`}>
                                                <Icon className="w-3 h-3" />
                                                {config?.label || cat}
                                                <span className="text-[9px] text-muted-foreground/40 font-normal normal-case ml-auto">
                                                    {fields.length} settings
                                                </span>
                                            </summary>
                                            <div className="space-y-2 pl-5 pb-3 border-l border-white/5 ml-1.5">
                                                {fields.map(([key, meta]) => renderField(key, meta))}
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm italic border border-dashed border-white/10 rounded-xl">
                                No configurable AI settings found.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-8">
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
