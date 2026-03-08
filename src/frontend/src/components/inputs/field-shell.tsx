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
    <label className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="field-label">{label}</span>
        {required ? <span className="text-xs font-medium text-emerald-700">*</span> : null}
      </div>
      {description ? <p className="field-help">{description}</p> : null}
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </label>
  );
}
