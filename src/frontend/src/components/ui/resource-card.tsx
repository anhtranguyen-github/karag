"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type ResourceCardItem = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  tier?: string;
  href: string;
};

type ResourceCardProps = Readonly<{
  item: ResourceCardItem;
  /** Override the default MoreVertical action button */
  actionButton?: ReactNode;
  /** Called when the card body is clicked (for non-Link navigation) */
  onClick?: () => void;
}>;

export function ResourceCard({ item, actionButton, onClick }: ResourceCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#e5e5e5]">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 truncate text-xs text-[#6b7280]">
              {item.description}
            </p>
          )}
        </div>
        {actionButton ?? (
          <button
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6b7280] opacity-0 transition-all hover:bg-[#2a2a2a] hover:text-[#e5e5e5] group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-400">
          {(item.status ?? "active").toUpperCase()}
        </span>
        {item.tier && (
          <span className="inline-flex items-center rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[11px] font-medium text-[#9ca3af]">
            {item.tier}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-[#6b7280] uppercase tracking-wider">
          {item.id.slice(0, 8)}
        </span>
      </div>
    </>
  );

  const cardClassName =
    "group block rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 text-left transition-colors hover:border-[#333]";

  if (onClick) {
    return (
      <button type="button" className={`${cardClassName} w-full cursor-pointer`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link className={cardClassName} href={item.href}>
      {content}
    </Link>
  );
}
