"use client";

import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  onSelect?: () => void;
};

type CommandPaletteProps = {
  items: CommandItem[];
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function CommandPalette({ items, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[20vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl shadow-black/60">
        <Command label="Global search">
          <div className="flex items-center gap-3 border-b border-[#2a2a2a] px-4 py-3">
            <Search className="h-4 w-4 text-[#6b7280]" />
            <Command.Input
              autoFocus
              className="w-full bg-transparent text-sm text-[#e5e5e5] outline-none placeholder:text-[#6b7280]"
              placeholder="Search pages, datasets, models, documents, or settings"
            />
            <button
              aria-label="Close search"
              className="shrink-0 rounded-lg p-1 text-[#6b7280] transition-colors hover:bg-[#222] hover:text-[#e5e5e5]"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-[#6b7280]">
              No matches found.
            </Command.Empty>
            {items.map((item) => (
              <Command.Item
                className="flex cursor-pointer items-start justify-between rounded-lg px-3 py-2.5 text-sm transition-colors data-[selected=true]:bg-[#222]"
                key={item.id}
                onSelect={() => {
                  if (item.href) {
                    router.push(item.href);
                  }
                  item.onSelect?.();
                  onOpenChange(false);
                }}
                value={`${item.label} ${item.hint ?? ""}`}
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-[#e5e5e5]">{item.label}</div>
                  {item.hint ? (
                    <div className="text-xs text-[#6b7280]">{item.hint}</div>
                  ) : null}
                </div>
              </Command.Item>
            ))}
          </Command.List>
          <div className="border-t border-[#2a2a2a] px-4 py-2">
            <div className="flex items-center gap-3 text-[11px] text-[#6b7280]">
              <span className="inline-flex items-center gap-1"><kbd className="kbd">↑↓</kbd> navigate</span>
              <span className="inline-flex items-center gap-1"><kbd className="kbd">↵</kbd> select</span>
              <span className="inline-flex items-center gap-1"><kbd className="kbd">esc</kbd> close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
