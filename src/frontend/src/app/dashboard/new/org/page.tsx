"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityPage } from "@/components/ui/create-entity-page";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { tenant, setOrganizationId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const organization = await platformApi.createOrganization({ name }, { actorId: tenant.actorId });
      setOrganizationId(organization.id);
      router.push(`/dashboard/org/${organization.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CreateEntityPage
      description="Create a new organization boundary for projects, workspaces, and members."
      label="Organization Name"
      loading={loading}
      onChange={setName}
      onSubmit={handleSubmit}
      placeholder="Acme Research"
      submitLabel="Create Organization"
      title="Create Organization"
      value={name}
    />
  );
}
