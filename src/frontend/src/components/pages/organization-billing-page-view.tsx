"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { PageHeader } from "@/components/ui/page-header";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationBillingPageView() {
  const { projects } = useTenant();
  const observabilityQuery = useQuery({
    queryKey: ["organization-billing", "observability"],
    queryFn: platformApi.observabilitySummary
  });

  return (
    <OrganizationGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Self-hosted billing is intentionally light in this console. Use this page for usage posture, support status, and high-level platform consumption."
          eyebrow="Organization"
          title="Billing"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard hint="Projects currently active in this organization." label="Projects" value={projects.length} />
          <MetricCard hint="Recent event types captured across the platform." label="Tracked signals" value={Object.keys(observabilityQuery.data?.event_counts ?? {}).length} />
          <MetricCard hint="This deployment is designed for self-hosted operation." label="Plan" value="Self-hosted enterprise" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Usage posture</CardTitle>
            <CardDescription>
              Billing in self-hosted mode is primarily operational rather than metered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              Track infrastructure costs through your own hosting stack. The dashboard exposes usage, logs, and observability so teams can build internal chargeback or governance workflows later.
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Add payment provider syncs or internal quota accounting here when the product grows beyond the current self-hosted admin model.
            </div>
          </CardContent>
        </Card>
      </div>
    </OrganizationGuard>
  );
}
