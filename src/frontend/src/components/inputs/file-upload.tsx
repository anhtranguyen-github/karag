"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { cn } from "@/lib/utils";

type FileUploadProps = {
  label: string;
  description?: string;
  error?: string;
  accept?: string;
  onChange?: (file: File | null) => void;
  value?: File | null;
};

export function FileUpload({
  label,
  description,
  error,
  accept,
  onChange,
  value
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <FieldShell label={label} description={description} error={error}>
      <button
        className={cn(
          "flex min-h-[128px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input bg-white/70 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50/60",
          dragging && "border-emerald-400 bg-emerald-50"
        )}
        onClick={(event) => {
          event.preventDefault();
          inputRef.current?.click();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0] ?? null;
          onChange?.(file);
        }}
        type="button"
      >
        <UploadCloud className="h-6 w-6 text-emerald-600" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            Drag and drop a document, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            {value ? value.name : "Supports PDF, text, and Markdown uploads"}
          </p>
        </div>
        <input
          accept={accept}
          className="hidden"
          onChange={(event) => onChange?.(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
      </button>
    </FieldShell>
  );
}
