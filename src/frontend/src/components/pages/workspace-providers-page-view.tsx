"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlugZap, ServerCrash, Wrench } from "lucide-react";
import { useState } from "react";

import { ConfigForm } from "@/components/config/config-form";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { providerFormDefinition } from "@/lib/form-definitions";
import { useUpsertWorkspaceCollection, useWorkspaceCollection } from "@/lib/local-query";
import type { ProviderConfig } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

function inferProviderStatus(
  providerType: string,
  dependencyHealth?: Awaited<ReturnType<typeof platformApi.dependencyHealth>>,
  runtimeModels?: Awaited<ReturnType<typeof platformApi.runtimeModels>>
) {
  if (!dependencyHealth) {
    return "not-configured" as const;
  }

  if (providerType === "qdrant") {
    return dependencyHealth.providers.vector_store === "qdrant" ? "connected" : "failed";
  }
  if (providerType === "minio") {
    return dependencyHealth.providers.storage_provider === "minio" ? "connected" : "failed";
  }
  if (providerType === "openai" || providerType === "ollama") {
    return runtimeModels?.some((entry) => entry.provider === providerType)
      ? "connected"
      : "failed";
  }
  return "not-configured";
}

export default function ProvidersPageView() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const providersQuery = useWorkspaceCollection<ProviderConfig>(tenant.workspaceId, "providers");
  const saveProvider = useUpsertWorkspaceCollection<ProviderConfig>(tenant.workspaceId, "providers");

  const dependencyHealthQuery = useQuery({
    queryKey: ["providers", "health"],
    queryFn: platformApi.dependencyHealth
  });

  const runtimeModelsQuery = useQuery({
    queryKey: ["providers", "runtime-models"],
    queryFn: platformApi.runtimeModels
  });

  const verifyProvider = useMutation({
    mutationFn: async (providerType: string) => {
      if (providerType === "openai" || providerType === "ollama") {
        const model =
          runtimeModelsQuery.data?.find((entry) => entry.provider === providerType)?.models[0] ??
          (providerType === "openai" ? "gpt-4o-mini" : "llama3");
        return platformApi.verifyChatProvider(tenant, {
          provider: providerType,
          model,
          workspace_id: tenant.workspaceId
        });
      }
      return Promise.resolve({ content: "ok" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["providers", "runtime-models"] });
    }
  });

  const providers = providersQuery.data ?? [];
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Configure provider records through typed forms, verify runtime connectivity, and surface install hints when a local dependency is missing."
          eyebrow="Infrastructure"
          title="Providers"
        />

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Provider configuration</CardTitle>
              <CardDescription>
                Save provider records per workspace. Verification status reflects live backend checks where endpoints already exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={providerFormDefinition}
                loading={saveProvider.isPending}
                onSubmit={async (values) => {
                  const status = inferProviderStatus(
                    values.providerType,
                    dependencyHealthQuery.data,
                    runtimeModelsQuery.data
                  );
                  await saveProvider.mutateAsync({
                    id: crypto.randomUUID(),
                    workspaceId: tenant.workspaceId!,
                    providerType: values.providerType,
                    name: values.name,
                    config: values,
                    status,
                    createdAt: new Date().toISOString()
                  });
                }}
                resetOnSubmit
              />
            </CardContent>
          </Card>

          <DataTable
            actions={
              <div className="min-w-[220px]">
                <SelectDropdown
                  label="Provider record"
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  options={providers.map((provider) => ({
                    label: provider.name,
                    value: provider.id
                  }))}
                  placeholder="Choose provider"
                  value={selectedProviderId}
                />
              </div>
            }
            columns={[
              {
                key: "provider",
                header: "Provider",
                render: (row) => (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.providerType}</div>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge
                    variant={
                      row.status === "connected"
                        ? "success"
                        : row.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {row.status}
                  </Badge>
                )
              },
              {
                key: "saved",
                header: "Saved",
                render: (row) => formatDate(row.createdAt)
              }
            ]}
            description="Workspace-scoped provider records."
            rows={providers}
            title="Saved providers"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Connection verification</CardTitle>
              <CardDescription>
                Validate a provider through the running backend instead of shell-based health checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProvider ? (
                <div className="rounded-xl border border-border/70 bg-white/70 p-4">
                  <div className="mb-4">
                    <div className="font-medium text-slate-900">{selectedProvider.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedProvider.providerType}</div>
                  </div>
                  <Button
                    onClick={() => verifyProvider.mutate(selectedProvider.providerType)}
                    type="button"
                  >
                    <PlugZap className="h-4 w-4" />
                    Verify connection
                  </Button>
                  {verifyProvider.data ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Provider responded successfully through the runtime API.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                  Save or select a provider record to verify it here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="install-helper">
            <CardHeader>
              <CardTitle>Install helper</CardTitle>
              <CardDescription>
                When a local service is not available, surface the recommended Docker action directly in the UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-white/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {dependencyHealthQuery.data?.providers.vector_store === "qdrant" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ServerCrash className="h-4 w-4 text-amber-600" />
                  )}
                  Vector database
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {dependencyHealthQuery.data?.providers.vector_store === "qdrant"
                    ? "Qdrant is detected as the active vector store."
                    : "Local service not detected. Install via Docker Compose."}
                </p>
                <Button className="mt-3" type="button" variant="outline">
                  <Wrench className="h-4 w-4" />
                  Install via Docker
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}



