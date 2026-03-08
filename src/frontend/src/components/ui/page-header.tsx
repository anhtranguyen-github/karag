import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 truncate text-2xl font-semibold text-slate-950">{title}</h2>
        {description ? <span className="hidden">{description}</span> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </section>
  );
}
