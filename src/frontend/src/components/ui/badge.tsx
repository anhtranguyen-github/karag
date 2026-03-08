import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "muted" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        variant === "default" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        variant === "muted" && "border-slate-200 bg-slate-50 text-slate-600",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        variant === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
        className
      )}
      {...props}
    />
  );
}
