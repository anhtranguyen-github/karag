"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { PageHeader } from "@/components/ui/page-header";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationSettingsPageView() {
  const { tenant, organizations, projects } = useTenant();
  const organization = organizations.find((entry) => entry.id === tenant.organizationId);

  return (
    <OrganizationGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Organization settings stay minimal by design. The heavy product surface lives at the project layer, while organizations mainly provide grouping and access boundaries."
          eyebrow="Organization"
          title="Organization settings"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard hint="Stable organization identifier used in routes and tenancy." label="Organization ID" value={organization?.id ?? "unknown"} />
          <MetricCard hint="Projects currently attached to this organization." label="Project count" value={projects.length} />
          <MetricCard hint="The organization layer is intentionally lightweight." label="Responsibility" value="Container of projects" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Current organization metadata exposed by the platform API.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{organization?.name ?? "Unknown organization"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</div>
              <div className="mt-2 text-sm leading-6 text-slate-700">
                {organization?.description ?? "No organization description is configured yet."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </OrganizationGuard>
  );
}
