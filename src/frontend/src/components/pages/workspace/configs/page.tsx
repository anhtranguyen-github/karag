"use client";

import { ConfigForm } from "@/components/config/config-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import {
  pipelineFormDefinition,
  providerFormDefinition,
  settingsFormDefinition
} from "@/lib/form-definitions";
import { useSaveWorkspaceRecord, useWorkspaceRecord } from "@/lib/local-query";
import type { WorkspaceSettingRecord } from "@/lib/types/platform";
import { useTenant } from "@/providers/tenant-provider";

const settingsFallback: WorkspaceSettingRecord = {
  workspaceId: "",
  storageProvider: "minio",
  embeddingProvider: "openai",
  defaultPipeline: "production-default",
  systemLimits: 25,
  maxUploadMb: 50,
  promptRedaction: true
};

export default function ConfigsPageView() {
  const { tenant } = useTenant();
  const settingsQuery = useWorkspaceRecord(tenant.workspaceId, "settings", settingsFallback);
  const saveSettings = useSaveWorkspaceRecord<WorkspaceSettingRecord>(tenant.workspaceId, "settings");

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader
          description="Shared typed forms live here so operators can manage platform configuration with consistent controls. This page acts as the schema renderer hub and mirrors how future backend-backed config modules should look."
          eyebrow="Schema renderer"
          title="Configs"
        />

        <section className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline profile schema</CardTitle>
              <CardDescription>
                Example of a config-only form driven entirely by field definitions and Zod validation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm definition={pipelineFormDefinition} onSubmit={async () => {}} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Provider config schema</CardTitle>
              <CardDescription>
                The same renderer handles secrets, multi-select capabilities, and typed endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm definition={providerFormDefinition} onSubmit={async () => {}} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workspace settings schema</CardTitle>
              <CardDescription>
                Persist a workspace-scoped settings record to the local dashboard store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm
                definition={settingsFormDefinition}
                initialValues={settingsQuery.data}
                onSubmit={async (values) => {
                  await saveSettings.mutateAsync({
                    ...values,
                    workspaceId: tenant.workspaceId!
                  });
                }}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </WorkspaceGuard>
  );
}



