"use client";

import { Copy, Trash2 } from "lucide-react";

import { ConfigForm } from "@/components/config/config-form";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { apiKeyFormDefinition, settingsFormDefinition } from "@/lib/form-definitions";
import {
  useProjectCollection,
  useRemoveProjectCollectionItem,
  useSaveProjectRecord,
  useUpsertProjectCollection,
  useProjectRecord
} from "@/lib/local-query";
import type { ProjectApiKeyRecord, ProjectSettingRecord } from "@/lib/types/platform";
import { formatDate } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";

const settingsFallback: ProjectSettingRecord = {
  projectId: "",
  storageProvider: "minio",
  embeddingProvider: "openai",
  defaultPipeline: "production-default",
  systemLimits: 25,
  maxUploadMb: 50,
  promptRedaction: true
};

function createPseudoKey() {
  const prefix = "krg";
  const body = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${body.slice(0, 32)}`;
}

export default function ProjectSettingsPageView() {
  const { tenant } = useTenant();
  const settingsQuery = useProjectRecord(tenant.projectId, "settings", settingsFallback);
  const saveSettings = useSaveProjectRecord<ProjectSettingRecord>(tenant.projectId, "settings");
  const keysQuery = useProjectCollection<ProjectApiKeyRecord>(tenant.projectId, "api-keys");
  const saveKey = useUpsertProjectCollection<ProjectApiKeyRecord>(tenant.projectId, "api-keys");
  const removeKey = useRemoveProjectCollectionItem<ProjectApiKeyRecord>(tenant.projectId, "api-keys");
  const keys = keysQuery.data ?? [];

  return (
    <ProjectGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Project settings hold the shared operational defaults for storage, upload limits, and API access. Workspaces inherit from here but stay focused on assistant behavior."
          eyebrow="Project"
          title="Settings"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Keys" value={keys.filter((key) => !key.revokedAt).length} />
          <MetricCard label="Storage" value={settingsQuery.data?.storageProvider ?? "minio"} />
          <MetricCard label="Prompts" value={settingsQuery.data?.promptRedaction ? "Redacted" : "Captured"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Project configuration</CardTitle>
              <CardDescription>
                Shared defaults for the project-level control plane.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={settingsFormDefinition}
                initialValues={settingsQuery.data}
                onSubmit={async (values) => {
                  await saveSettings.mutateAsync({
                    ...values,
                    projectId: tenant.projectId!
                  });
                }}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Create API key</CardTitle>
                <CardDescription>
                  Project keys front the document and runtime surfaces for integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigForm
                  definition={apiKeyFormDefinition}
                  onSubmit={async (values) => {
                    await saveKey.mutateAsync({
                      id: crypto.randomUUID(),
                      projectId: tenant.projectId!,
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
              </CardContent>
            </Card>

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
                  render: (row) => row.scope
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
              description="Project-level API keys stored in the dashboard state layer."
              rows={keys}
              title="Project API keys"
            />
          </div>
        </section>
      </div>
    </ProjectGuard>
  );
}
