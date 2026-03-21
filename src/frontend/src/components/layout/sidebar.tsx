
"use client";

import {
  Blocks,
  Clock,
  CreditCard,
  Files,
  HardDrive,
  LayoutGrid,
  MessageSquareText,
  Settings2,
  Users,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";
import { matchRoute } from "@/lib/navigation";

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  alsoMatch?: string[];
};

function SidebarLink({
  item,
  active,
  expanded,
}: Readonly<{
  item: SidebarItem;
  active: boolean;
  expanded: boolean;
}>) {
  return (
    <Link
      href={item.href}
      title={expanded ? undefined : item.label}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg transition-colors",
        expanded ? "w-full px-3" : "w-9 justify-center",
        active
          ? "bg-[#1f1f1f] text-orange-400"
          : "text-[#6b7280] hover:bg-[#1a1a1a] hover:text-[#e5e5e5]"
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {expanded && (
        <span className="truncate text-[13px] font-medium">{item.label}</span>
      )}
    </Link>
  );
}

/* ─── Shared hover-expand sidebar shell ─────────────────────────── */

function HoverSidebar({
  items,
  pathname,
}: Readonly<{ items: SidebarItem[]; pathname: string }>) {
  const [hovered, setHovered] = useState(false);

  return (
    <aside
      style={{ display: "block" }}
      className={cn(
        "shrink-0 border-r border-[#2a2a2a] bg-[#141414] transition-[width] duration-200 ease-in-out max-lg:hidden",
        hovered ? "w-[200px]" : "w-14"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "sticky top-14 flex h-[calc(100vh-56px)] flex-col gap-0.5 overflow-hidden py-3",
          hovered ? "items-stretch px-2" : "items-center"
        )}
      >
        {items.map((item) => {
          const baseMatch = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
          const extraMatch = item.alsoMatch?.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`)
          ) ?? false;
          const active = baseMatch || extraMatch;
          return (
            <SidebarLink
              key={item.href}
              item={item}
              active={active}
              expanded={hovered}
            />
          );
        })}
      </div>
    </aside>
  );
}

/* ─── Main export ────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const route = matchRoute(pathname);
  const { tenant } = useTenant();

  /* Org level */
  if (route.scope === "dashboard") {
    const orgIdFromUrl = pathname.match(/\/dashboard\/org\/([^/]+)/)?.[1] ?? null;
    const orgId = orgIdFromUrl ?? tenant.organizationId;
    const base = orgId ? `/dashboard/org/${orgId}` : "/dashboard";
    const items: SidebarItem[] = [
      { href: base, label: "Projects", icon: LayoutGrid, exact: true },
      { href: `${base}/members`, label: "Team", icon: Users },
      { href: `${base}/settings`, label: "Settings", icon: Settings2 },
    ];
    return <HoverSidebar items={items} pathname={pathname} />;
  }

  /* Project level */
  if (route.scope === "project") {
    const base = `/dashboard/project/${encodeURIComponent(route.projectId)}`;
    const items: SidebarItem[] = [
      { href: `${base}/workspaces`, label: "Workspaces", icon: Blocks, alsoMatch: [base] },
      { href: `${base}/documents`, label: "Document Storage", icon: HardDrive },
      { href: `${base}/members`, label: "Members", icon: Users },
      { href: `${base}/settings`, label: "Settings", icon: Settings2 },
    ];
    return <HoverSidebar items={items} pathname={pathname} />;
  }

  /* Workspace level */
  if (route.scope === "workspace") {
    const base = `/dashboard/workspace/${encodeURIComponent(route.workspaceId)}`;
    const items: SidebarItem[] = [
      { href: `${base}/chat`, label: "Chat", icon: MessageSquareText },
      { href: `${base}/history`, label: "History", icon: Clock },
      { href: `${base}/context-docs`, label: "Documents", icon: Files },
      { href: `${base}/members`, label: "Members", icon: Users },
      { href: `${base}/settings`, label: "Settings", icon: Settings2 },
    ];
    return <HoverSidebar items={items} pathname={pathname} />;
  }

  return null;
}
