"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { PageHeader } from "@/components/ui/page-header";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationMembersPageView() {
  const { tenant, organizations, projects } = useTenant();
  const organization = organizations.find((entry) => entry.id === tenant.organizationId);

  return (
    <OrganizationGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Organization membership stays lightweight. Enterprise identity and role enforcement happen in Keycloak and the backend policy layer."
          eyebrow="Organization"
          title="Members"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard hint="Current operator for this dashboard session." label="Signed in as" value={tenant.actorId ?? "dashboard-user"} />
          <MetricCard hint="Projects currently visible inside this organization." label="Projects" value={projects.length} />
          <MetricCard hint="Membership is intentionally simple at the organization layer." label="Role model" value="Organization admin" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{organization?.name ?? "Organization"} access</CardTitle>
            <CardDescription>
              This build exposes the organization shell while backend member management stays delegated to identity and policy services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{tenant.actorId ?? "dashboard-user"}</div>
                  <div className="text-xs text-muted-foreground">
                    Current dashboard operator
                  </div>
                </div>
                <Badge variant="success">Admin</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Add real member directory, invites, and role assignment here once the backend exposes organization membership endpoints.
            </div>
          </CardContent>
        </Card>
      </div>
    </OrganizationGuard>
  );
}
