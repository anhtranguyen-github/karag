"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import OrganizationProjectsPageView from "@/components/pages/organization-projects-page-view";
import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { organizationFormDefinition } from "@/lib/form-definitions";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { isReady, organizations, tenant, setOrganizationId } = useTenant();

  const createOrganization = useMutation({
    mutationFn: platformApi.createOrganization,
    onSuccess: async (organization) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setOrganizationId(organization.id);
    }
  });

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!tenant.organizationId && organizations.length) {
      setOrganizationId(organizations[0].id);
    }
  }, [isReady, organizations, setOrganizationId, tenant.organizationId]);

  if (!isReady) {
    return (
      <EmptyState
        description="Loading organization context."
        title="Loading dashboard"
      />
    );
  }

  if (organizations.length || tenant.organizationId) {
    return <OrganizationProjectsPageView />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Organization" title="Create organization" />

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigForm
            definition={organizationFormDefinition}
            loading={createOrganization.isPending}
            onSubmit={async (values) => {
              await createOrganization.mutateAsync(values);
            }}
            resetOnSubmit
          />
        </CardContent>
      </Card>
    </div>
  );
}
