"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/providers/query-provider";
import { TenantProvider } from "@/providers/tenant-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TenantProvider>{children}</TenantProvider>
    </QueryProvider>
  );
}
