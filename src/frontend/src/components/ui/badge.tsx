import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "muted" | "success" | "warning" | "danger" | "outline" | "secondary" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
        variant === "default" && "border-primary/20 bg-primary/10 text-primary",
        variant === "secondary" && "border-secondary bg-secondary text-secondary-foreground",
        variant === "muted" && "border-border bg-muted/50 text-muted-foreground",
        variant === "destructive" && "border-destructive/20 bg-destructive/10 text-destructive-foreground",
        variant === "success" && "border-success/20 bg-success/10 text-success",
        variant === "warning" && "border-warning/20 bg-warning/10 text-warning",
        variant === "danger" && "border-destructive/20 bg-destructive/10 text-destructive-foreground",
        variant === "outline" && "border-border bg-transparent text-foreground",
        className
      )}
      {...props}
    />
  );
}
