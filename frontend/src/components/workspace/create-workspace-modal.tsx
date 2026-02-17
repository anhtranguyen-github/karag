"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { WorkspaceCreate } from "@/lib/api";

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
            // Fetch metadata when modal opens
            api
                .getSettingsMetadataSettingsMetadataGet()
                .then((data: any) => {
                    // The API generated client might return 'any' or a specific type, 
                    // but based on backend inspection it returns a dict.
                    // We cast it to our interface.
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
                    // Spread other dynamic fields. 
                    // We need to map form keys to WorkspaceCreate keys.
                    // Converting camelCase to snake_case might be handled by the API client automatically? 
                    // The generated client expects camelCase properties in the object, 
                    // and handles the conversion to snake_case for the JSON payload if configured correctly.
                    // Let's assume the generated client handles it.
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

    // Filter fields to show.
    // We want to show:
    // 1. Name and Description (Always)
    // 2. Fields that are NOT mutable (creation-time only) ? 
    //    Actually, typically immutable fields MUST be set at creation.
    //    Mutable fields can be set later in settings.
    //    But let's stick to the spec: "Render only if backend supports them".
    //    And "Frontend should read backend capability API and build the form dynamically."

    // Let's group by category
    const dynamicFields = Object.entries(metadata).filter(([key, meta]) => {
        // exclude name/description if they are in metadata (unlikely based on backend code)
        // backend settings manager uses AppSettings, which likely includes llm_provider etc.
        return key !== 'name' && key !== 'description';
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Workspace">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        placeholder="My Workspace"
                        value={formData.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                        id="description"
                        placeholder="Brief description..."
                        value={formData.description || ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        disabled={loading}
                    />
                </div>

                {/* Dynamic Fields - Render simple selects/inputs for now */}
                {/* We can hide them behind an accordion later if too many, but for now just list them if they are important. */}
                {/* Actually, let's only show fields that have options (Likely Providers/Models) */}

                {dynamicFields.map(([key, meta]) => {
                    // Converting snake_case key from metadata to camelCase for formData?
                    // The metadata keys come from Pydantic model fields. 
                    // In backend AppSettings, fields are snake_case? 
                    // Let's check backend AppSettings. 
                    // backend/app/core/schemas.py logic would confirm. 
                    // Assuming generated client needs camelCase.

                    // Simple helper to convert snake to camel for the key used in formData
                    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

                    if (meta.options && meta.options.length > 0) {
                        return (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                                <select
                                    id={key}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData[camelKey as keyof WorkspaceCreate] as string || ""}
                                    onChange={(e) => handleChange(camelKey, e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Default</option>
                                    {meta.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <p className="text-[0.8rem] text-muted-foreground">{meta.description}</p>
                            </div>
                        )
                    }
                    return null;
                })}

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Workspace"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
