import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata = {
  title: "Karag Enterprise RAG Platform",
  description: "Enterprise self-hosted RAG control plane and data plane console"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
