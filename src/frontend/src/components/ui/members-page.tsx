"use client";

import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/ui/page-shell";

export type Member = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  mfaEnabled: boolean;
  inherited?: boolean;
};

const ROLE_OPTIONS = ["admin", "member", "viewer"] as const;

export function MembersPage({
  scopeLabel,
  title,
  subtitle,
  members,
  canManage = false,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  isMutating = false,
}: {
  scopeLabel: string;
  title: string;
  subtitle: string;
  members: Member[];
  canManage?: boolean;
  onAddMember?: (userId: string, role: string) => void;
  onUpdateMember?: (memberId: string, role: string) => void;
  onRemoveMember?: (memberId: string) => void;
  isMutating?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<(typeof ROLE_OPTIONS)[number]>("member");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.email.toLowerCase().includes(search.toLowerCase()) ||
          member.displayName.toLowerCase().includes(search.toLowerCase())
      ),
    [members, search]
  );

  return (
    <PageShell scopeLabel={scopeLabel} title={title} subtitle={subtitle}>
      <div className="app-panel px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter members"
              value={search}
            />
          </div>
          {canManage ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Actor ID or email"
                value={newUserId}
                onChange={(event) => setNewUserId(event.target.value)}
              />
              <select
                className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button
                disabled={!newUserId.trim() || isMutating}
                onClick={() => {
                  onAddMember?.(newUserId.trim(), newRole);
                  setNewUserId("");
                  setNewRole("member");
                }}
              >
                Add Member
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                key={member.id}
              >
                <div>
                  <p className="font-medium text-foreground">{member.displayName}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {canManage && !member.inherited ? (
                    <select
                      className="h-9 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                      value={roleDrafts[member.id] ?? member.role}
                      onChange={(event) =>
                        setRoleDrafts((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="status-pill">{member.role}</span>
                  )}
                  {member.inherited ? (
                    <span className="status-pill status-pill--warning">Inherited</span>
                  ) : null}
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    {member.mfaEnabled ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldOff className="h-4 w-4" />}
                    MFA {member.mfaEnabled ? "enabled" : "disabled"}
                  </span>
                  {canManage && !member.inherited ? (
                    <>
                      <Button
                        disabled={isMutating || (roleDrafts[member.id] ?? member.role) === member.role}
                        onClick={() => onUpdateMember?.(member.id, roleDrafts[member.id] ?? member.role)}
                        variant="outline"
                      >
                        Update Role
                      </Button>
                      <Button
                        disabled={isMutating}
                        onClick={() => onRemoveMember?.(member.id)}
                        variant="destructive"
                      >
                        Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No members match this filter.
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
