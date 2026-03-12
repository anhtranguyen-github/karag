"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageShell from "@/components/ui/page-shell";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceApiKeysPage() {
  const { tenant, hasPermission, isPermissionsReady } = useTenant();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const canManageApiKeys = hasPermission("org.admin");

  const apiKeysQuery = useQuery({
    queryKey: ["api-keys", tenant.organizationId, tenant.projectId],
    queryFn: () => platformApi.listApiKeys(tenant),
    enabled: Boolean(tenant.organizationId && tenant.projectId && canManageApiKeys),
  });

  const createMutation = useMutation({
    mutationFn: () => platformApi.createApiKey(tenant, { name }),
    onSuccess: (data) => {
      setCreatedKey(data.key_value);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys", tenant.organizationId, tenant.projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (apiKeyId: string) => platformApi.deleteApiKey(tenant, apiKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", tenant.organizationId, tenant.projectId] });
    },
  });

  return (
    <WorkspaceGuard>
      <PageShell
        scopeLabel="Workspace"
        title="API Keys"
        subtitle="Workspace operations inherit project-scoped API keys backed by the backend."
      >
        {!canManageApiKeys && isPermissionsReady ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              API key management requires organization admin access.
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Create Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input disabled={!canManageApiKeys} onChange={(event) => setName(event.target.value)} placeholder="Agent key" value={name} />
            </div>
            <Button disabled={!canManageApiKeys || !name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
            {createdKey ? (
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm">
                <p className="font-medium text-foreground">New key</p>
                <p className="mt-2 break-all text-muted-foreground">{createdKey}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Project Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(apiKeysQuery.data ?? []).map((apiKey) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                key={apiKey.id}
              >
                <div>
                  <p className="font-medium text-foreground">{apiKey.name}</p>
                  <p className="text-sm text-muted-foreground">{apiKey.masked_key ?? apiKey.id}</p>
                </div>
                <Button
                  disabled={!canManageApiKeys || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(apiKey.id)}
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            ))}
            {!apiKeysQuery.isLoading && (apiKeysQuery.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                No API keys created for this project yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    </WorkspaceGuard>
  );
}
