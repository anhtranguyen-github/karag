"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MembersPage } from "@/components/ui/members-page";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationMembersPage() {
  const { tenant, hasPermission } = useTenant();
  const queryClient = useQueryClient();
  const canManage = hasPermission("org.admin");
  const membersQuery = useQuery({
    queryKey: ["members", "organization", tenant.organizationId, tenant.actorId],
    queryFn: () => platformApi.listMembers(tenant.organizationId!, tenant),
    enabled: Boolean(tenant.organizationId),
  });

  const createMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      platformApi.createMembership(tenant.organizationId!, { user_id: userId, role }, tenant),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "organization", tenant.organizationId, tenant.actorId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      platformApi.updateMembership(membershipId, tenant.organizationId!, { role }, tenant),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "organization", tenant.organizationId, tenant.actorId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (membershipId: string) =>
      platformApi.deleteMembership(membershipId, tenant.organizationId!, tenant),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "organization", tenant.organizationId, tenant.actorId] }),
  });

  return (
    <OrganizationGuard>
      <MembersPage
        members={(membersQuery.data ?? []).map((member) => ({
          id: member.id,
          email: member.email,
          displayName: member.display_name,
          role: member.role,
          mfaEnabled: member.mfa_enabled,
          inherited: member.inherited,
        }))}
        scopeLabel="Organization"
        subtitle="Organization membership sourced from the backend."
        title="Team"
        canManage={canManage}
        isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        onAddMember={(userId, role) => createMutation.mutate({ userId, role })}
        onUpdateMember={(membershipId, role) => updateMutation.mutate({ membershipId, role })}
        onRemoveMember={(membershipId) => {
          if (confirm("Remove this organization member?")) {
            deleteMutation.mutate(membershipId);
          }
        }}
      />
    </OrganizationGuard>
  );
}
