"use client";

import Link from "next/link";
import { Building2, FolderKanban, LayoutGrid } from "lucide-react";

import PageShell from "@/components/ui/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/providers/tenant-provider";

export default function NewLandingPage() {
  const { tenant } = useTenant();

  const options = [
    { title: "Organization", description: "Start a new top-level account boundary.", href: "/dashboard/new/org", icon: Building2, disabled: false },
    { title: "Project", description: "Create a project inside the current organization.", href: "/dashboard/new/project", icon: FolderKanban, disabled: !tenant.organizationId },
    { title: "Workspace", description: "Create a workspace inside the current project.", href: "/dashboard/new/workspace", icon: LayoutGrid, disabled: !tenant.projectId },
  ];

  return (
    <PageShell
      scopeLabel="Create"
      title="New Resource"
      subtitle="Every creation flow now uses the same simpler page structure."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {options.map((option) => (
          <Link href={option.disabled ? "#" : option.href} key={option.title}>
            <Card className={option.disabled ? "pointer-events-none opacity-50" : ""}>
              <CardHeader>
                <option.icon className="h-5 w-5 text-primary" />
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">{option.disabled ? "Unavailable" : "Open"}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
