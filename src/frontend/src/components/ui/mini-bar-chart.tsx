import { cn, toTitleCase } from "@/lib/utils";

export function MiniBarChart({
  title,
  values,
  color = "emerald"
}: {
  title: string;
  values: Record<string, number>;
  color?: "emerald" | "sky" | "amber";
}) {
  const entries = Object.entries(values);
  const maximum = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="surface p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              <span>{toTitleCase(key)}</span>
              <span>{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-2 rounded-full",
                  color === "emerald" && "bg-emerald-500",
                  color === "sky" && "bg-sky-500",
                  color === "amber" && "bg-amber-500"
                )}
                style={{ width: `${Math.max((value / maximum) * 100, 6)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
