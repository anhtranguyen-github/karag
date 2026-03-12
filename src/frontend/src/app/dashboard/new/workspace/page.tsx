"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityPage } from "@/components/ui/create-entity-page";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { tenant, setWorkspaceId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant.organizationId || !tenant.projectId) return;
    setLoading(true);
    try {
      const workspace = await platformApi.createWorkspace(tenant, { name });
      setWorkspaceId(workspace.id);
      router.push(`/dashboard/workspace/${workspace.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CreateEntityPage
      description="Create a workspace inside the selected project."
      disabled={!tenant.projectId}
      label="Workspace Name"
      loading={loading}
      onChange={setName}
      onSubmit={handleSubmit}
      placeholder="Production Knowledge Base"
      submitLabel="Create Workspace"
      title="Create Workspace"
      value={name}
    />
  );
}
