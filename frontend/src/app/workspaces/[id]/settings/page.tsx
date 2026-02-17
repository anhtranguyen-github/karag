"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Save, Loader2, Info } from "lucide-react";

interface SettingField {
    mutable: boolean;
    category: string;
    description: string;
    options?: string[];
}

interface SettingsMetadata {
    [key: string]: SettingField;
}

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [metadata, setMetadata] = useState<SettingsMetadata>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchData();
        }
    }, [workspaceId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, metadataRes] = await Promise.all([
                api.getSettingsSettingsGet({ workspaceId }),
                api.getSettingsMetadataSettingsMetadataGet(),
            ]);
            setSettings(settingsRes.data || {});
            setMetadata(metadataRes.data || {});
        } catch (e) {
            console.error("Failed to fetch settings", e);
            setMessage({ type: "error", text: "Failed to load settings." });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            // Filter out non-mutable settings if necessary, though backend should handle it
            await api.updateSettingsSettingsPatch({
                workspaceId,
                requestBody: settings,
            });
            setMessage({ type: "success", text: "Settings saved successfully." });
        } catch (e) {
            console.error("Failed to save settings", e);
            setMessage({ type: "error", text: "Failed to save settings." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Group settings by category
    const categories = Array.from(new Set(Object.values(metadata).map((f) => f.category)));

    return (
        <div className="p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold">Workspace Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Configure how this workspace behaves.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-12 pb-12">
                {categories.map((category) => (
                    <div key={category} className="space-y-6">
                        <h2 className="text-lg font-medium border-b pb-2">{category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(metadata)
                                .filter(([_, field]) => field.category === category)
                                .map(([key, field]) => {
                                    const value = settings[key];
                                    const isMutable = field.mutable;

                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={key} className={cn(!isMutable && "opacity-50")}>
                                                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </Label>
                                                {!isMutable && (
                                                    <div className="group relative">
                                                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] p-2 rounded shadow-md w-48 z-10 border">
                                                            This setting is fixed for the lifetime of the workspace.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {field.options ? (
                                                <select
                                                    id={key}
                                                    value={value || ""}
                                                    onChange={(e) => handleChange(key, e.target.value)}
                                                    disabled={!isMutable}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="" disabled>Select an option</option>
                                                    {field.options.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : typeof value === "boolean" ? (
                                                <div className="flex items-center h-10">
                                                    <input
                                                        type="checkbox"
                                                        id={key}
                                                        checked={!!value}
                                                        onChange={(e) => handleChange(key, e.target.checked)}
                                                        disabled={!isMutable}
                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </div>
                                            ) : (
                                                <Input
                                                    id={key}
                                                    type={typeof value === "number" ? "number" : "text"}
                                                    value={value ?? ""}
                                                    onChange={(e) =>
                                                        handleChange(key, typeof value === "number" ? Number(e.target.value) : e.target.value)
                                                    }
                                                    disabled={!isMutable}
                                                    placeholder={field.description}
                                                />
                                            )}
                                            {field.description && (
                                                <p className="text-xs text-muted-foreground">{field.description}</p>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}

                <div className="pt-12 mt-12 border-t">
                    <h2 className="text-lg font-medium text-destructive mb-2">Danger Zone</h2>
                    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">Delete this workspace</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Once you delete a workspace, there is no going back. Please be certain.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
                                    try {
                                        await api.deleteWorkspaceWorkspacesWorkspaceIdDelete({ workspaceId });
                                        window.location.href = "/";
                                    } catch (e) {
                                        console.error(e);
                                        alert("Failed to delete workspace.");
                                    }
                                }
                            }}
                        >
                            Delete Workspace
                        </Button>
                    </div>
                </div>

                <div className="pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-8 px-8 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        {message && (
                            <p className={cn("text-sm", message.type === "success" ? "text-green-600" : "text-destructive")}>
                                {message.text}
                            </p>
                        )}
                        <div className="flex-1" />
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
