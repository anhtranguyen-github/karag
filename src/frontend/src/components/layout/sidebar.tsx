
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
}: Readonly<{
  item: SidebarItem;
  active: boolean;
}>) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 group relative",
        active
          ? "bg-primary/10 text-primary-foreground before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-r-md before:bg-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0 transition-transform", active && "scale-110", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate text-sm font-medium font-body">{item.label}</span>
    </Link>
  );
}

function HoverSidebar({
  items,
  pathname,
}: Readonly<{ items: SidebarItem[]; pathname: string }>) {
  return (
    <aside
      className="h-screen w-64 fixed left-0 top-0 border-r border-white/5 bg-background flex flex-col p-4 space-y-2 z-50 shadow-[20px_0_40px_rgba(8,14,28,0.4)] max-lg:hidden"
    >
      <div className="mb-6 px-4 pt-2">
        <h1 className="text-2xl font-black text-primary font-display tracking-tight">Karag Enterprise</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">v2.4.0-monolith</p>
      </div>
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        <div className="px-2 pb-2 pt-1 mt-2">
          <p className="section-label">Navigation</p>
        </div>
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
            />
          );
        })}
      </div>
      <div className="pt-4 border-t border-border/50 space-y-1 mt-auto pb-4">
        {/* Help Center spacing */}
      </div>
    </aside>
  );
}

/* ─── Main export ────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const route = matchRoute(pathname);
  const { tenant, hasPermission } = useTenant();

  /* Org level */
  if (route.scope === "dashboard") {
    const orgIdFromUrl = pathname.match(/\/dashboard\/org\/([^/]+)/)?.[1] ?? null;
    const orgId = orgIdFromUrl ?? tenant.organizationId;
    const base = orgId ? `/dashboard/org/${orgId}` : "/dashboard";
    const items: SidebarItem[] = [
      { href: base, label: "Projects", icon: LayoutGrid, exact: true },
      { href: `${base}/members`, label: "Team", icon: Users },
      ...(hasPermission("org.edit") ? [{ href: `${base}/settings`, label: "Settings", icon: Settings2 }] : []),
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
      ...(hasPermission("project.edit") ? [{ href: `${base}/settings`, label: "Settings", icon: Settings2 }] : []),
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
      ...(
        hasPermission("workspace.edit") || hasPermission("workspace.delete")
          ? [{ href: `${base}/settings`, label: "Settings", icon: Settings2 }]
          : []
      ),
    ];
    return <HoverSidebar items={items} pathname={pathname} />;
  }

  return null;
}
