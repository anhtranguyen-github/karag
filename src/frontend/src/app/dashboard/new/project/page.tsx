"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/api/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateProjectPage() {
    const router = useRouter();
    const { tenant, setProjectId } = useTenant();
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant.organizationId) return;

        setLoading(true);
        try {
            const project = await platformApi.createProject(tenant.organizationId, { id, name });
            setProjectId(project.id);
            router.push(`/dashboard/project/${project.id}`);
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-amber-100 shadow-xl shadow-amber-500/10">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-950">Create Project</CardTitle>
                    <CardDescription className="text-slate-500">
                        Create a new project in your current organization.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id" className="text-slate-700">Project ID</Label>
                            <Input
                                id="id"
                                placeholder="e.g. backend-api"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                required
                                className="border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                            />
                            <p className="text-[11px] text-slate-400">Unique identifier for this project.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700">Project Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Backend API"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                            disabled={loading || !id || !name || !tenant.organizationId}
                        >
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
