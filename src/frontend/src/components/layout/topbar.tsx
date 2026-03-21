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
  Bell
} from "lucide-react";
import {
  generateProjectUrl,
  generateWorkspaceUrl,
  matchRoute,
  type ProjectSection,
  type WorkspaceSection
} from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PrimaryButton } from "@/components/ui/primary-button";
// ─── Feedback Button & Modal ─────────────────────────────────────────
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <button
        className="flex h-8 items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 text-sm text-[#9ca3af] transition-colors hover:text-[#e5e5e5]"
        onClick={() => setOpen(true)}
        title="Feedback"
        type="button"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <h2 className="mb-2 text-lg font-semibold text-[#e5e5e5]">Send Feedback</h2>
        {submitted ? (
          <div className="py-6 text-center text-[#9ca3af]">Thank you for your feedback!</div>
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
            <div className="flex justify-end">
              <PrimaryButton
                type="submit"
                disabled={submitting || !message.trim()}
                className="min-w-[100px]"
              >
                {submitting ? "Sending..." : "Send"}
              </PrimaryButton>
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
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-[#9ca3af] transition-colors hover:bg-[#2a2a2a]"
        title={actorId ?? "User"}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserCircle2 className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#2a2a2a] bg-[#181818] shadow-2xl shadow-black/50">
          <button
            className="w-full px-4 py-3 text-left text-sm text-[#e5e5e5] hover:bg-[#232323] rounded-t-xl"
            onClick={() => {
              setOpen(false);
              globalThis.location.href = "/dashboard/account/settings";
            }}
          >
            Account Settings
          </button>
          <button
            className="w-full px-4 py-3 text-left text-sm text-[#e53e3e] hover:bg-[#232323] rounded-b-xl border-t border-[#2a2a2a]"
            onClick={() => {
              setOpen(false);
              globalThis.location.href = "/logout";


            }}
          >
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
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#1f1f1f]"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Org icon */}
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/15 text-orange-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="3" />
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 10v3M9.5 15.5l-2 1M14.5 15.5l2 1" />
          </svg>
        </div>

        <span className="max-w-[180px] truncate text-sm font-semibold text-[#e5e5e5]">
          {currentOrg?.name ?? "Select organization"}
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[#6b7280] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[300px] overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl shadow-black/50">
          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
              <input
                ref={inputRef}
                className="h-8 w-full rounded-lg border border-[#2a2a2a] bg-[#121212] pl-8 pr-3 text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none transition focus:border-orange-500/50"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find organization..."
                value={search}
              />
            </div>
          </div>

          {/* Org list */}
          <div className="max-h-52 overflow-y-auto px-1.5 pb-1">
            {filteredOrgs.map((org, idx) => {
              const selected = org.id === tenant.organizationId;
              const focused = idx === focusIdx;
              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                    selected && "bg-[#222]",
                    focused && !selected && "bg-[#1f1f1f]",
                    selected ? "text-[#e5e5e5]" : "text-[#9ca3af]",
                    !selected && !focused && "hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
                  )}
                  key={org.id}
                  onClick={() => selectOrg(org.id)}
                  onMouseEnter={() => setFocusIdx(idx)}
                >
                  <span className="truncate font-medium">{org.name}</span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-orange-400" />
                  )}
                </button>
              );
            })}
            {filteredOrgs.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-[#6b7280]">
                No organizations found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#2a2a2a] px-1.5 py-1">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
            >
              All Organizations
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/new/org");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
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
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-[#1f1f1f]",
          disabled && "pointer-events-none opacity-50",
          selectedLabel ? "text-[#e5e5e5]" : "text-[#6b7280]"
        )}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="max-w-[160px] truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-[#6b7280] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl shadow-black/50">
          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
              <input
                ref={inputRef}
                className="h-8 w-full rounded-lg border border-[#2a2a2a] bg-[#121212] pl-8 pr-3 text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none transition focus:border-orange-500/50"
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
                    selected && "bg-[#222]",
                    focused && !selected && "bg-[#1f1f1f]",
                    selected ? "text-[#e5e5e5]" : "text-[#9ca3af]",
                    !selected && !focused && "hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
                  )}
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  onMouseEnter={() => setFocusIdx(idx)}
                >
                  <span className="truncate font-medium">{opt.label}</span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-orange-400" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-[#6b7280]">
                No results found
              </div>
            )}
          </div>

          {/* Footer */}
          {(allLabel || newLabel) && (
            <div className="border-t border-[#2a2a2a] px-1.5 py-1">
              {allLabel && allHref && (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
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
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
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
    <header className="sticky top-0 z-40 border-b border-[#2a2a2a] bg-[#141414]">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        {/* Left: Org switcher + breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <OrgSwitcher />
          {breadcrumbExtras}
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Feedback Modal State */}
          <FeedbackButton />

          <button
            className="flex h-8 min-w-[160px] items-center justify-between gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 text-sm text-[#9ca3af] transition-colors hover:text-[#e5e5e5]"
            onClick={onOpenSearch}
            title="Search"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Search
            </span>
            <span className="kbd">
              <Command className="h-2.5 w-2.5" />K
            </span>
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition-colors hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Notification Bell Icon Button */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-[#9ca3af] transition-colors hover:bg-[#2a2a2a] mr-1"
            title="Notifications"
            type="button"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Icon with Dropdown Menu */}
          <UserMenu actorId={tenant.actorId} />
        </div>
      </div>
    </header>
  );
}
