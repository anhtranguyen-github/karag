"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-4 py-24 backdrop-blur-sm">
      <div className="surface w-full max-w-2xl overflow-hidden">
        <Command label="Global search">
          <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search pages, datasets, models, documents, or settings"
            />
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-muted-foreground">
              No matches found.
            </Command.Empty>
            {items.map((item) => (
              <Command.Item
                className="flex cursor-pointer items-start justify-between rounded-lg px-3 py-3 text-sm data-[selected=true]:bg-emerald-50"
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
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{item.label}</div>
                  {item.hint ? (
                    <div className="text-xs leading-5 text-muted-foreground">{item.hint}</div>
                  ) : null}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
