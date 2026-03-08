import { InputHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Input } from "@/components/ui/input";

type TextInputProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ label, description, error, required, ...props }: TextInputProps) {
  return (
    <FieldShell
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Input {...props} />
    </FieldShell>
  );
}
