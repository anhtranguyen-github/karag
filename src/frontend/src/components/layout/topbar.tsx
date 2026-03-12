import {
  Box,
  Check,
  ChevronDown,
  Command,
  FolderKanban,
  HelpCircle,
  MessageSquare,
  Plus,
  Search,
  UserCircle2,
  Bell,
  Settings2,
  LogOut,
  LogOut as LogoutIcon,
  Settings,
  User,
  Settings2 as SettingsIcon
} from "lucide-react";
import {
  generateProjectUrl,
  generateWorkspaceUrl,
  matchRoute,
  type ProjectSection,
  type WorkspaceSection
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";
import { cn, formatCount, formatDate } from "@/lib/utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// ─── Feedback Button & Modal ─────────────────────────────────────────
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        title="Feedback"
        type="button"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground/90">Send Feedback</h2>
        {submitted ? (
          <div className="py-8 text-center text-muted-foreground animate-fade-in">Thank you for your feedback!</div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              // TODO: send to backend or service
              setTimeout(() => {
                setSubmitting(false);
                setSubmitted(true);
                setMessage("");
                setTimeout(() => setOpen(false), 1200);
              }, 800);
            }}
          >
            <Textarea
              required
              placeholder="Your feedback..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="bg-[#181818] border-[#2a2a2a] text-[#e5e5e5] placeholder-[#6b7280] min-h-[100px]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                className="min-w-[100px]"
              >
                {submitting ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

// ─── User Menu Dropdown ──────────────────────────────────────────────
export function UserMenu({ actorId }: { readonly actorId?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onMouseDown);
      return () => document.removeEventListener("mousedown", onMouseDown);
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:bg-muted hover:text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={actorId ?? "User"}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserCircle2 className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl animate-fade-in">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => {
              setOpen(false);
              globalThis.location.href = "/dashboard/account/settings";
            }}
          >
            <Settings2 className="h-4 w-4" />
            Account Settings
          </button>
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              setOpen(false);
              globalThis.location.href = "/logout";
            }}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}


/* ─── Org Switcher ─────────────────────────────────────────────────── */

function OrgSwitcher() {
  const router = useRouter();
  const { tenant, organizations, setOrganizationId } = useTenant();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentOrg = organizations.find((o) => o.id === tenant.organizationId);

  const filteredOrgs = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setSearch("");
      setFocusIdx(-1);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Reset focus index when search changes
  useEffect(() => {
    setFocusIdx(-1);
  }, [search]);

  const selectOrg = useCallback(
    (orgId: string) => {
      setOrganizationId(orgId);
      setOpen(false);
      router.push(`/dashboard/org/${orgId}`);
    },
    [setOrganizationId, router]
  );

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((prev) => Math.min(prev + 1, filteredOrgs.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && focusIdx >= 0 && focusIdx < filteredOrgs.length) {
        e.preventDefault();
        selectOrg(filteredOrgs[focusIdx].id);
      }
    },
    [filteredOrgs, focusIdx, selectOrg]
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* ── Trigger ── */}
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/55 px-3 py-2 transition-colors hover:bg-muted/70"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/14 text-primary">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="3" />
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 10v3M9.5 15.5l-2 1M14.5 15.5l2 1" />
          </svg>
        </div>

        <span className="max-w-[180px] truncate text-sm font-semibold text-foreground">
          {currentOrg?.name ?? "Select organization"}
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl animate-fade-in">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                className="h-9 pl-9"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find organization..."
                value={search}
              />
            </div>
          </div>

          {/* Org list */}
          <div className="max-h-60 overflow-y-auto p-1.5 pt-2">
            {filteredOrgs.map((org, idx) => {
              const selected = org.id === tenant.organizationId;
              const focused = idx === focusIdx;
              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    selected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    focused && !selected && "bg-muted/50"
                  )}
                  key={org.id}
                  onClick={() => selectOrg(org.id)}
                  onMouseEnter={() => setFocusIdx(idx)}
                >
                  <span className="truncate">{org.name}</span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              );
            })}
            {filteredOrgs.length === 0 && (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No organizations found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 p-1.5">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
            >
              All Organizations
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/new/org");
              }}
            >
              <Plus className="h-4 w-4" />
              New organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Breadcrumb selectors for project/workspace scopes ──────────── */

function ScopeSelector({
  ariaLabel,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  icon,
  allLabel,
  allHref,
  newLabel,
  newHref
}: Readonly<{
  ariaLabel: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  allLabel?: string;
  allHref?: string;
  newLabel?: string;
  newHref?: string;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setFocusIdx(-1);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setFocusIdx(-1);
  }, [search]);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && focusIdx >= 0 && focusIdx < filtered.length) {
        e.preventDefault();
        select(filtered[focusIdx].value);
      }
    },
    [filtered, focusIdx, select]
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-card/45 px-3 text-sm font-medium transition-all hover:bg-muted/70 active:scale-[0.98]",
          disabled && "pointer-events-none opacity-50",
          selectedLabel ? "text-foreground" : "text-muted-foreground"
        )}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="max-w-[160px] truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                className="h-9 w-full rounded-xl border border-border bg-card/60 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Find ${placeholder.toLowerCase()}...`}
                value={search}
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto px-1.5 pb-1.5">
            {filtered.map((opt, idx) => {
              const selected = opt.value === value;
              const focused = idx === focusIdx;
              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                    selected && "bg-primary/10",
                    focused && !selected && "bg-muted/60",
                    selected ? "text-foreground" : "text-muted-foreground",
                    !selected && !focused && "hover:bg-muted/60 hover:text-foreground"
                  )}
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  onMouseEnter={() => setFocusIdx(idx)}
                >
                  <span className="truncate font-medium">{opt.label}</span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          </div>

          {/* Footer */}
          {(allLabel || newLabel) && (
            <div className="border-t border-border px-1.5 py-1">
              {allLabel && allHref && (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  onClick={() => {
                    setOpen(false);
                    router.push(allHref);
                  }}
                >
                  {allLabel}
                </button>
              )}
              {newLabel && newHref && (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  onClick={() => {
                    setOpen(false);
                    router.push(newHref);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {newLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Topbar ────────────────────────────────────────────────── */

export function Topbar({ onOpenSearch }: Readonly<{ onOpenSearch: () => void }>) {
  const pathname = usePathname();
  const router = useRouter();
  const route = matchRoute(pathname);
  const {
    tenant,
    projects,
    workspaces,
    setProjectId,
    setWorkspaceId
  } = useTenant();

  const currentProjectSection: ProjectSection =
    route.scope === "project" ? route.section : "overview";
  const currentWorkspaceSection: WorkspaceSection =
    route.scope === "workspace" ? route.section : "overview";

  // Build breadcrumb extras for project/workspace scopes
  let breadcrumbExtras = null;
  if (route.scope === "project") {
    breadcrumbExtras = (
      <>
        <span className="text-[#3a3a3a]">/</span>
        <ScopeSelector
          allHref={tenant.organizationId ? `/dashboard/org/${tenant.organizationId}` : "/dashboard"}
          allLabel="All Projects"
          ariaLabel="Switch project"
          disabled={!projects.length}
          icon={<FolderKanban className="h-3.5 w-3.5 text-[#6b7280]" />}
          newHref="/dashboard/new/project"
          newLabel="New project"
          onChange={(nextProjectId) => {
            if (!nextProjectId) return;
            setProjectId(nextProjectId);
            router.push(
              generateProjectUrl(nextProjectId, currentProjectSection)
            );
          }}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          placeholder="Project"
          value={tenant.projectId ?? ""}
        />
      </>
    );
  } else if (route.scope === "workspace") {
    breadcrumbExtras = (
      <>
        <span className="text-[#3a3a3a]">/</span>
        <ScopeSelector
          allHref={tenant.organizationId ? `/dashboard/org/${tenant.organizationId}` : "/dashboard"}
          allLabel="All Projects"
          ariaLabel="Switch project"
          disabled={!projects.length}
          icon={<FolderKanban className="h-3.5 w-3.5 text-[#6b7280]" />}
          newHref="/dashboard/new/project"
          newLabel="New project"
          onChange={(nextProjectId) => {
            if (!nextProjectId) return;
            setProjectId(nextProjectId);
            router.push(generateProjectUrl(nextProjectId));
          }}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          placeholder="Project"
          value={tenant.projectId ?? ""}
        />
        <span className="text-[#3a3a3a]">/</span>
        <ScopeSelector
          allHref={tenant.projectId ? `/dashboard/project/${tenant.projectId}/workspaces` : "/dashboard"}
          allLabel="All Workspaces"
          ariaLabel="Switch workspace"
          disabled={!workspaces.length}
          icon={<Box className="h-3.5 w-3.5 text-[#6b7280]" />}
          newHref="/dashboard/new/workspace"
          newLabel="New workspace"
          onChange={(nextWorkspaceId) => {
            if (!nextWorkspaceId) return;
            setWorkspaceId(nextWorkspaceId);
            router.push(
              generateWorkspaceUrl(nextWorkspaceId, currentWorkspaceSection)
            );
          }}
          options={workspaces.map((w) => ({ label: w.name, value: w.id }))}
          placeholder="Workspace"
          value={tenant.workspaceId ?? ""}
        />
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-background flex justify-between items-center px-8 border-b border-border/20 backdrop-blur-xl">
      <div className="flex items-center gap-6 md:gap-8">
        {/* We can hide Karag logo here if it's already in Sidebar but kept on mobile */}
        <span className="text-xl font-black text-primary tracking-tighter font-display lg:hidden">Karag</span>
        
        <div className="flex items-center gap-2">
          <OrgSwitcher />
          {breadcrumbExtras}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          className="hidden h-9 w-64 items-center justify-between gap-3 rounded-full bg-muted border border-border px-4 text-sm text-muted-foreground transition-all hover:ring-2 hover:ring-primary/30 focus:ring-2 focus:ring-primary/30 lg:flex"
          onClick={onOpenSearch}
          title="Search"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search...
          </span>
          <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-semibold text-muted-foreground bg-popover rounded-md">
            <Command className="h-2.5 w-2.5 mr-1 inline" />K
          </kbd>
        </button>
        
        <FeedbackButton />
        
        <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-all">
          <Bell className="h-5 w-5" />
        </button>
        
        <div className="pl-2 border-l border-border/50">
           <UserMenu actorId={tenant.actorId} />
        </div>
      </div>
    </header>
  );
}
