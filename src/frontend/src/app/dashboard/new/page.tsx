"use client";

import Link from "next/link";
import { Building2, FolderKanban, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/providers/tenant-provider";

export default function NewLandingPage() {
    const { tenant } = useTenant();

    const options = [
        {
            title: "Organization",
            description: "Create a new top-level organization to manage projects and teams.",
            href: "/dashboard/new/org",
            icon: Building2,
            color: "blue"
        },
        {
            title: "Project",
            description: "Create a new project within your current organization.",
            href: "/dashboard/new/project",
            icon: FolderKanban,
            color: "amber",
            disabled: !tenant.organizationId
        },
        {
            title: "Workspace",
            description: "Create a new workspace within your current project.",
            href: "/dashboard/new/workspace",
            icon: LayoutGrid,
            color: "emerald",
            disabled: !tenant.projectId
        }
    ];

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-6">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">What would you like to create?</h1>
                <p className="mt-2 text-slate-500">Select an option below to get started.</p>
            </div>

            <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                {options.map((option) => (
                    <Link
                        key={option.title}
                        href={option.disabled ? "#" : option.href}
                        className={option.disabled ? "cursor-not-allowed opacity-60" : "group"}
                    >
                        <Card className={`h-full border-slate-200 transition-all hover:border-${option.color}-200 hover:shadow-xl hover:shadow-${option.color}-500/10`}>
                            <CardHeader>
                                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-${option.color}-50 text-${option.color}-600 transition-colors group-hover:bg-${option.color}-100`}>
                                    <option.icon size={24} />
                                </div>
                                <CardTitle className="text-xl">{option.title}</CardTitle>
                                <CardDescription className="leading-relaxed">{option.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
