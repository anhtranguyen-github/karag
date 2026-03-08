import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldShellProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FieldShell({
  label,
  description,
  error,
  required,
  children,
  className
}: FieldShellProps) {
  return (
    <div className={cn("grid gap-2 mb-2 group", className)}>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="field-label transition-colors group-focus-within:text-primary">{label}</span>
          {required ? <span className="text-xs font-bold text-destructive/80" title="Required field">*</span> : null}
        </label>
        {description ? (
          <p className="text-xs leading-relaxed text-slate-500 max-w-prose">
            {description}
          </p>
        ) : null}
      </div>
      <div className="relative">
        {children}
      </div>
      {error ? (
        <p className="field-error animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
