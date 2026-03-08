"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, KeyRound, Trash2 } from "lucide-react";

import { ConfigForm } from "@/components/config/config-form";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { apiKeyFormDefinition } from "@/lib/form-definitions";
import {
  useRemoveWorkspaceCollectionItem,
  useUpsertWorkspaceCollection,
  useWorkspaceCollection
} from "@/lib/local-query";
import type { ApiKeyRecord } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

function createPseudoKey() {
  const prefix = "krg";
  const body = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${body.slice(0, 32)}`;
}

export default function ApiKeysPageView() {
  const { tenant } = useTenant();
  const keysQuery = useWorkspaceCollection<ApiKeyRecord>(tenant.workspaceId, "api-keys");
  const saveKey = useUpsertWorkspaceCollection<ApiKeyRecord>(tenant.workspaceId, "api-keys");
  const removeKey = useRemoveWorkspaceCollectionItem<ApiKeyRecord>(tenant.workspaceId, "api-keys");
  const keys = keysQuery.data ?? [];

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Issue scoped API keys from the dashboard, surface their current usage counters, and revoke them without leaving the browser. The current implementation stores keys per workspace in the dashboard state layer."
          eyebrow="Access"
          title="API keys"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            hint="Keys currently available in the active workspace."
            label="Active keys"
            value={keys.filter((key) => !key.revokedAt).length}
          />
          <MetricCard
            hint="Total simulated usage counts tracked in the dashboard."
            label="Usage count"
            value={keys.reduce((sum, key) => sum + key.usageCount, 0)}
          />
          <MetricCard
            hint="Revoked keys remain visible for auditability."
            label="Revoked keys"
            value={keys.filter((key) => key.revokedAt).length}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="surface p-6">
            <div className="mb-5 space-y-1">
              <h3 className="text-lg font-semibold text-slate-950">Create API key</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Generate a new key and scope it to the actions the consumer needs.
              </p>
            </div>
            <ConfigForm
              definition={apiKeyFormDefinition}
              onSubmit={async (values) => {
                await saveKey.mutateAsync({
                  id: crypto.randomUUID(),
                  workspaceId: tenant.workspaceId!,
                  name: values.name,
                  value: createPseudoKey(),
                  scope: values.scope,
                  usageCount: 0,
                  createdAt: new Date().toISOString(),
                  revokedAt: null
                });
              }}
              resetOnSubmit
            />
          </div>

          <DataTable
            columns={[
              {
                key: "name",
                header: "Key",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.value}</div>
                  </div>
                )
              },
              {
                key: "scope",
                header: "Scope",
                render: (row) => <Badge variant="muted">{row.scope}</Badge>
              },
              {
                key: "usage",
                header: "Usage",
                render: (row) => row.usageCount
              },
              {
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.createdAt)
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        await navigator.clipboard.writeText(row.value);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => removeKey.mutate(row.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              }
            ]}
            description="Current key inventory for the selected workspace."
            rows={keys}
            title="Workspace API keys"
          />
        </section>
      </div>
    </WorkspaceGuard>
  );
}



