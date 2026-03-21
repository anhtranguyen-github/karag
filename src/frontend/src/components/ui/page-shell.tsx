"use client";

import React, { ReactNode } from "react";

export type PageShellProps = {
  title?: string;
  subtitle?: string;
  scopeLabel?: string; // e.g., "Workspace" or "Project"
  children?: ReactNode;
};

export default function PageShell({ title, subtitle, scopeLabel, children }: PageShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-8 p-6 rounded-xl bg-slate-50 text-slate-900 shadow text-center flex flex-col gap-2">
        {scopeLabel ? <div className="text-sm font-bold uppercase text-slate-500">{scopeLabel}</div> : null}
        {subtitle ? (
          <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-10">
        {title ? (
          <div className="mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          </div>
        ) : null}

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
