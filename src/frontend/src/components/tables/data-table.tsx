import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  title?: string;
  description?: string;
  columns: Column<T>[];
  rows: T[];
  emptyState?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DataTable<T>({
  title,
  description,
  columns,
  rows,
  emptyState,
  actions,
  className
}: DataTableProps<T>) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {title || description || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
          <div className="space-y-1">
            {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
            {description ? <span className="hidden">{description}</span> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500",
                    column.className
                  )}
                  key={column.key}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr className="bg-white/60 align-top" key={rowIndex}>
                  {columns.map((column) => (
                    <td className={cn("px-4 py-3 text-sm text-slate-700", column.className)} key={column.key}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8" colSpan={columns.length}>
                  {emptyState ?? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                      Nothing to show yet.
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
