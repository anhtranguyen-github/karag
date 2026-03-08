import { InputHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";

type SliderInputProps = {
  label: string;
  description?: string;
  error?: string;
  valueLabel?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SliderInput({
  label,
  description,
  error,
  valueLabel,
  value,
  ...props
}: SliderInputProps) {
  return (
    <FieldShell label={label} description={description} error={error}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Range</span>
          <span>{valueLabel ?? value}</span>
        </div>
        <input
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-emerald-600"
          type="range"
          value={value}
          {...props}
        />
      </div>
    </FieldShell>
  );
}
