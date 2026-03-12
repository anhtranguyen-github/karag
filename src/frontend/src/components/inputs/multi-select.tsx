import { FieldShell } from "@/components/inputs/field-shell";
import type { SelectOption } from "@/components/inputs/select-dropdown";
import { cn } from "@/lib/utils";

type MultiSelectProps = {
  label: string;
  description?: string;
  error?: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
};

export function MultiSelect({
  label,
  description,
  error,
  options,
  value,
  onChange
}: MultiSelectProps) {
  return (
    <FieldShell label={label} description={description} error={error}>
      <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-[#121212]/80 p-2">
        {options.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-400"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-[#e5e5e5] hover:border-[#4b5563]"
              )}
              key={option.value}
              onClick={(event) => {
                event.preventDefault();
                onChange(
                  active
                    ? value.filter((entry) => entry !== option.value)
                    : [...value, option.value]
                );
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}
