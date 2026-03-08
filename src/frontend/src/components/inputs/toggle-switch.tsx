import type { InputHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  label: string;
  description?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function ToggleSwitch({
  label,
  description,
  error,
  checked,
  onChange,
  ...props
}: ToggleSwitchProps) {
  return (
    <FieldShell label={label} description={description} error={error}>
      <span className="inline-flex items-center justify-between rounded-lg border border-input bg-white/80 px-3 py-3">
        <span className="text-sm text-muted-foreground">
          {checked ? "Enabled" : "Disabled"}
        </span>
        <span className="relative inline-flex">
          <input
            checked={checked}
            className="peer sr-only"
            onChange={onChange}
            type="checkbox"
            {...props}
          />
          <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500" />
          <span
            className={cn(
              "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </span>
      </span>
    </FieldShell>
  );
}
