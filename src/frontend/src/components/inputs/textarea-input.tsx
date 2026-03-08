import { TextareaHTMLAttributes } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Textarea } from "@/components/ui/textarea";

type TextareaInputProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaInput({
  label,
  description,
  error,
  required,
  ...props
}: TextareaInputProps) {
  return (
    <FieldShell
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Textarea {...props} />
    </FieldShell>
  );
}
