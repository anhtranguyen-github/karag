"use client";

import React, { ReactNode } from "react";

export type PageShellProps = {
  title?: string;
  subtitle?: string;
  scopeLabel?: string;
  children?: ReactNode;
};

export default function PageShell({ title, subtitle, scopeLabel, children }: PageShellProps) {
  return (
    <div className="flex-1 overflow-y-auto w-full max-w-[1520px] mx-auto mb-10 p-8">
      <div className="space-y-8 animate-in fade-in-from-bottom-4 duration-700">
        {(scopeLabel || title || subtitle) && (
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {scopeLabel && <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{scopeLabel}</p>}
              {title && <h1 className="text-4xl font-extrabold text-foreground font-display tracking-tight mb-2">{title}</h1>}
              {subtitle && <p className="text-muted-foreground mt-1 text-lg max-w-2xl">{subtitle}</p>}
            </div>
          </section>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
