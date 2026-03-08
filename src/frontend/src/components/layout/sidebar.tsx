
"use client";

import { Blocks, UserCircle2, Settings2 } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildSidebarSections, matchRoute, type NavigationItem } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, item: NavigationItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarItem({
  pathname,
  item,
  tone
}: {
  pathname: string;
  item: NavigationItem;
  tone: "organization" | "project" | "workspace";
}) {
  const active = isItemActive(pathname, item);
  const Icon = item.icon;

  let colorClass = "text-slate-600 hover:bg-white hover:text-slate-900";
  let iconClass = "bg-slate-100 text-slate-500";
  if (tone === "organization") {
    if (active) {
      colorClass = "bg-blue-100 text-blue-900";
      iconClass = "bg-blue-200 text-blue-900";
    }
  } else if (tone === "project") {
    if (active) {
      colorClass = "bg-amber-100 text-amber-900";
      iconClass = "bg-amber-200 text-amber-900";
    }
  } else if (tone === "workspace") {
    if (active) {
      colorClass = "bg-emerald-100 text-emerald-900";
      iconClass = "bg-emerald-200 text-emerald-900";
    }
  }
  return (
    <Link
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition",
        colorClass
      )}
      href={item.href}
    >
      <span className={cn("rounded-md p-1.5", iconClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

  const pathname = usePathname();
  const route = matchRoute(pathname);
  const { tenant } = useTenant();

  // Organization scope sidebar
  if (route.scope === "dashboard") {
    // Minimal org sidebar: Projects, Members, Settings
    const orgItems: NavigationItem[] = [
      {
        href: tenant.organizationId ? `/dashboard/org/${tenant.organizationId}` : "/dashboard/org",
        label: "Organization",
        description: "Organization overview",
        icon: Blocks
      },
      {
        href: tenant.organizationId ? `/dashboard/org/${tenant.organizationId}/members` : "/dashboard/org/members",
        label: "Members",
        description: "Organization members",
        icon: UserCircle2
      },
      {
        href: tenant.organizationId ? `/dashboard/org/${tenant.organizationId}/settings` : "/dashboard/org/settings",
        label: "Settings",
        description: "Organization settings",
        icon: Settings2
      }
    ];
    return (
      <aside className="hidden w-[220px] shrink-0 border-r border-blue-100/80 bg-blue-50/35 xl:block">
        <div className="sticky top-14 flex h-[calc(100vh-56px)] flex-col gap-5 overflow-y-auto px-3 py-4">
          <div className="space-y-1 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              Organization
            </div>
          </div>
          <nav className="space-y-1">
            {orgItems.map((item) => (
              <SidebarItem item={item} key={item.href} pathname={pathname} tone="organization" />
            ))}
          </nav>
        </div>
      </aside>
    );
  }

  // Project scope sidebar
  if (route.scope === "project") {
    const sections = buildSidebarSections({ route });
    return (
      <aside className="hidden w-[220px] shrink-0 border-r border-amber-100/80 bg-amber-50/35 xl:block">
        <div className="sticky top-14 flex h-[calc(100vh-56px)] flex-col gap-5 overflow-y-auto px-3 py-4">
          <div className="space-y-1 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Project
            </div>
            <div className="truncate text-sm font-semibold text-slate-950">{route.projectId}</div>
          </div>
          {sections.map((section) => (
            <div className="space-y-1.5" key={section.id}>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem item={item} key={item.href} pathname={pathname} tone="project" />
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // Workspace scope sidebar
  if (route.scope === "workspace") {
    const sections = buildSidebarSections({ route });
    return (
      <aside className="hidden w-[220px] shrink-0 border-r border-emerald-100/80 bg-emerald-50/35 xl:block">
        <div className="sticky top-14 flex h-[calc(100vh-56px)] flex-col gap-5 overflow-y-auto px-3 py-4">
          <div className="space-y-1 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Workspace
            </div>
            <div className="truncate text-sm font-semibold text-slate-950">{route.workspaceId}</div>
          </div>
          {sections.map((section) => (
            <div className="space-y-1.5" key={section.id}>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem item={item} key={item.href} pathname={pathname} tone="workspace" />
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return null;
}
