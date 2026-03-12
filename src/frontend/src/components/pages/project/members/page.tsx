"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MembersPage } from "@/components/ui/members-page";
import { ProjectGuard } from "@/components/ui/project-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectMembersPage() {
  const { tenant, hasPermission } = useTenant();
  const queryClient = useQueryClient();
  const canManage = hasPermission("project.edit") || hasPermission("org.admin");
  const membersQuery = useQuery({
    queryKey: ["members", "project", tenant.organizationId, tenant.projectId, tenant.actorId],
    queryFn: () => platformApi.listMembers(tenant.organizationId!, tenant, tenant.projectId),
    enabled: Boolean(tenant.organizationId && tenant.projectId),
  });

  const createMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      platformApi.createMembership(tenant.organizationId!, { user_id: userId, role }, tenant, tenant.projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "project", tenant.organizationId, tenant.projectId, tenant.actorId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      platformApi.updateMembership(membershipId, tenant.organizationId!, { role }, tenant, tenant.projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "project", tenant.organizationId, tenant.projectId, tenant.actorId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (membershipId: string) =>
      platformApi.deleteMembership(membershipId, tenant.organizationId!, tenant, tenant.projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", "project", tenant.organizationId, tenant.projectId, tenant.actorId] }),
  });

  return (
    <ProjectGuard>
      <MembersPage
        members={(membersQuery.data ?? []).map((member) => ({
          id: member.id,
          email: member.email,
          displayName: member.display_name,
          role: member.role,
          mfaEnabled: member.mfa_enabled,
          inherited: member.inherited,
        }))}
        scopeLabel="Project"
        subtitle="Project membership sourced from backend scope and inherited organization roles."
        title="Project Members"
        canManage={canManage}
        isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        onAddMember={(userId, role) => createMutation.mutate({ userId, role })}
        onUpdateMember={(membershipId, role) => updateMutation.mutate({ membershipId, role })}
        onRemoveMember={(membershipId) => {
          if (confirm("Remove this project member?")) {
            deleteMutation.mutate(membershipId);
          }
        }}
      />
    </ProjectGuard>
  );
}
