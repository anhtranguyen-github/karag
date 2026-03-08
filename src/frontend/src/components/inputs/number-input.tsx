import { InputHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Input } from "@/components/ui/input";

type NumberInputProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function NumberInput({
  label,
  description,
  error,
  required,
  ...props
}: NumberInputProps) {
  return (
    <FieldShell
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Input inputMode="numeric" type="number" {...props} />
    </FieldShell>
  );
}
