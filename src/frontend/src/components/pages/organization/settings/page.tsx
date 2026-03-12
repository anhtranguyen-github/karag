"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import PageShell from "@/components/ui/page-shell";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationSettingsPage() {
  const { tenant, hasPermission, isPermissionsReady } = useTenant();
  const params = useParams();
  const orgId = params.orgId as string;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const organizationQuery = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => platformApi.getOrganization(orgId, { actorId: tenant.actorId }),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (!organizationQuery.data) {
      return;
    }
    setName(organizationQuery.data.name);
    setDescription(organizationQuery.data.description || "");
  }, [organizationQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      platformApi.updateOrganization(orgId, body, { actorId: tenant.actorId }),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization", orgId], data);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const canEdit = hasPermission("org.edit");

  return (
    <OrganizationGuard>
      <PageShell
        scopeLabel="Organization"
        title="Settings"
        subtitle="Simplified identity and lifecycle controls for this organization."
      >
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Identifier</Label>
              <Input disabled value={orgId} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input disabled={!canEdit} onChange={(event) => setName(event.target.value)} value={name} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea disabled={!canEdit} className="min-h-32" onChange={(event) => setDescription(event.target.value)} value={description} />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              disabled={!isPermissionsReady || !canEdit || organizationQuery.isLoading || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ name, description })}
            >
              {!canEdit ? "Admin Access Required" : updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    </OrganizationGuard>
  );
}
