import type { InputHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";

type CheckboxInputProps = {
  label: string;
  description?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function CheckboxInput({
  label,
  description,
  error,
  checked,
  onChange,
  ...props
}: CheckboxInputProps) {
  return (
    <FieldShell label={label} description={description} error={error}>
      <span className="inline-flex items-center gap-3 rounded-lg border border-input bg-white/80 px-3 py-3">
        <input checked={checked} onChange={onChange} type="checkbox" {...props} />
        <span className="text-sm text-muted-foreground">
          {checked ? "Included" : "Excluded"}
        </span>
      </span>
    </FieldShell>
  );
}
