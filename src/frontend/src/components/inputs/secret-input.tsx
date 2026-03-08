"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SecretInputProps = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

export function SecretInput({
  label,
  description,
  error,
  required,
  value,
  placeholder,
  onChange
}: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <div className="flex gap-2">
        <Input
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={value}
        />
        <Button onClick={() => setVisible((current) => !current)} size="icon" type="button" variant="outline">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </FieldShell>
  );
}
