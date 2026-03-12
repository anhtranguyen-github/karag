"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityPage } from "@/components/ui/create-entity-page";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateProjectPage() {
  const router = useRouter();
  const { tenant, setProjectId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant.organizationId) return;
    setLoading(true);
    try {
      const project = await platformApi.createProject(tenant.organizationId, { name }, { actorId: tenant.actorId });
      setProjectId(project.id);
      router.push(`/dashboard/project/${project.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CreateEntityPage
      description="Create a project within the selected organization."
      disabled={!tenant.organizationId}
      label="Project Name"
      loading={loading}
      onChange={setName}
      onSubmit={handleSubmit}
      placeholder="Customer Support"
      submitLabel="Create Project"
      title="Create Project"
      value={name}
    />
  );
}
