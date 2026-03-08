"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/api/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateOrganizationPage() {
    const router = useRouter();
    const { setOrganizationId } = useTenant();
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const org = await platformApi.createOrganization({ id, name });
            setOrganizationId(org.id);
            router.push(`/dashboard/org/${org.id}`);
        } catch (error) {
            console.error("Failed to create organization:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-blue-100 shadow-xl shadow-blue-500/10">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-950">Create Organization</CardTitle>
                    <CardDescription className="text-slate-500">
                        Get started by creating your first organization.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id" className="text-slate-700">Organization ID</Label>
                            <Input
                                id="id"
                                placeholder="e.g. acme-corp"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                required
                                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p className="text-[11px] text-slate-400">This unique ID will be used in your workspace URLs.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700">Display Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Acme Corporation"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                            disabled={loading || !id || !name}
                        >
                            {loading ? "Creating..." : "Create Organization"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
