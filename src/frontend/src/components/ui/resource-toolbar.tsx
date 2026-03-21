"use client";

import { ArrowUpDown, Grid3X3, List, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type ResourceToolbarProps = Readonly<{
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}>;

export function ResourceToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  viewMode,
  onViewModeChange,
}: ResourceToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
          <input
            className="h-8 w-64 rounded-xl border border-[#2a2a2a] bg-[#121212] pl-8 pr-3 text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none focus:border-orange-500"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            value={search}
          />
        </div>
        <button className="flex h-8 items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm text-[#9ca3af] hover:text-[#e5e5e5]">
          Status
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm text-[#9ca3af] hover:text-[#e5e5e5]">
          <ArrowUpDown className="h-3 w-3" />
          Sort
        </button>
      </div>
      <div className="flex rounded-xl border border-[#2a2a2a]">
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-l-md transition-colors",
            viewMode === "grid"
              ? "bg-[#2a2a2a] text-[#e5e5e5]"
              : "bg-[#1a1a1a] text-[#9ca3af] hover:text-[#e5e5e5]"
          )}
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-r-md border-l border-[#2a2a2a] transition-colors",
            viewMode === "list"
              ? "bg-[#2a2a2a] text-[#e5e5e5]"
              : "bg-[#1a1a1a] text-[#9ca3af] hover:text-[#e5e5e5]"
          )}
          onClick={() => onViewModeChange("list")}
          title="List view"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type ResourceGridProps = Readonly<{
  viewMode: "grid" | "list";
  isEmpty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}>;

export function ResourceGrid({
  viewMode,
  isEmpty,
  emptyLabel = "No items found.",
  children,
}: ResourceGridProps) {
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#141414] p-12 text-center text-[#6b7280]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-2"
      )}
    >
      {children}
    </div>
  );
}
