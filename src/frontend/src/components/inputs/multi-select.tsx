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
      <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-white/80 p-2">
        {options.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
