"use client";

import { ExternalLink, MoreVertical, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";

import { OrganizationGuard } from "@/components/ui/organization-guard";


// Placeholder member data until API is wired
const DEMO_MEMBERS = [
  {
    id: "1",
    email: "admin@karag.dev",
    displayName: "Admin User",
    role: "Owner" as const,
    mfaEnabled: true,
    joinedAt: "2024-11-01T00:00:00Z"
  },
  {
    id: "2",
    email: "dashboard-user",
    displayName: "Dashboard User",
    role: "Administrator" as const,
    mfaEnabled: false,
    joinedAt: "2025-01-15T00:00:00Z"
  }
];

type Role = "Owner" | "Administrator" | "Developer" | "Read only";

function RoleBadge({ role }: Readonly<{ role: Role }>) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#2a2a2a] px-2.5 py-0.5 text-xs font-medium text-[#9ca3af]">
      {role}
    </span>
  );
}

export default function OrganizationMembersPage() {
  const [search, setSearch] = useState("");

  const members = DEMO_MEMBERS;

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          m.displayName.toLowerCase().includes(search.toLowerCase())
      ),
    [members, search]
  );

  return (
    <OrganizationGuard>
      <div className="mx-auto w-full max-w-5xl py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#e5e5e5]">Team</h1>
          <div className="flex items-center gap-2">
            <button
              className="flex h-8 items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm text-[#9ca3af] transition-colors hover:text-[#e5e5e5]"
            >
              <ExternalLink className="h-3 w-3" />
              Docs
            </button>
            <button className="h-8 rounded-lg bg-orange-500 px-3.5 text-sm font-medium text-[#e5e5e5] hover:bg-orange-600 transition-colors">
              Invite members
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              className="h-8 w-full rounded-xl border border-[#2a2a2a] bg-[#121212] pl-8 pr-3 text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none focus:border-orange-500"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter members"
              value={search}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[#2a2a2a]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#6b7280]">
                  Member
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#6b7280]">
                  MFA
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#6b7280]">
                  Role
                </th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  className="border-b border-[#2a2a2a] bg-[#1a1a1a] last:border-b-0 hover:bg-[#1f1f1f] transition-colors"
                  key={member.id}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2a] text-xs font-semibold text-[#e5e5e5]">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#e5e5e5]">
                          {member.displayName}
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.mfaEnabled ? (
                      <ShieldCheck className="h-4 w-4 text-orange-400" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-[#4b5563]" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#2a2a2a] hover:text-[#e5e5e5]">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-[#6b7280]"
                    colSpan={4}
                  >
                    No members match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="mt-3 text-xs text-[#6b7280]">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>
    </OrganizationGuard>
  );
}
