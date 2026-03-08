"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/api/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateWorkspacePage() {
    const router = useRouter();
    const { tenant, setWorkspaceId } = useTenant();
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant.organizationId || !tenant.projectId) return;

        setLoading(true);
        try {
            const workspace = await platformApi.createWorkspace(tenant, { id, name });
            setWorkspaceId(workspace.id);
            router.push(`/dashboard/workspace/${workspace.id}`);
        } catch (error) {
            console.error("Failed to create workspace:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-emerald-100 shadow-xl shadow-emerald-500/10">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-950">Create Workspace</CardTitle>
                    <CardDescription className="text-slate-500">
                        Create a new workspace in project <span className="font-semibold">{tenant.projectId}</span>.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id" className="text-slate-700">Workspace ID</Label>
                            <Input
                                id="id"
                                placeholder="e.g. dev-environment"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                required
                                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <p className="text-[11px] text-slate-400">Unique identifier for this workspace.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700">Workspace Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Development Environment"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                            disabled={loading || !id || !name || !tenant.projectId}
                        >
                            {loading ? "Creating..." : "Create Workspace"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
