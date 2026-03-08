"use client";

import { useEffect, useState } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Textarea } from "@/components/ui/textarea";

type JsonEditorProps = {
  label: string;
  description?: string;
  error?: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
};

export function JSONEditor({
  label,
  description,
  error,
  value,
  onChange
}: JsonEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | undefined>();

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <FieldShell label={label} description={description} error={error ?? parseError}>
      <Textarea
        className="font-mono text-xs"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next) as Record<string, unknown>;
            setParseError(undefined);
            onChange(parsed);
          } catch (nextError) {
            setParseError(
              nextError instanceof Error ? nextError.message : "JSON parsing failed"
            );
          }
        }}
        rows={8}
        value={text}
      />
    </FieldShell>
  );
}
