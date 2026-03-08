import { SelectHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectDropdownProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectDropdown({
  label,
  description,
  error,
  required,
  options,
  placeholder,
  className,
  ...props
}: SelectDropdownProps) {
  return (
    <FieldShell
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
