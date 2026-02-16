import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScienChan — Intelligence Vault",
  description: "Multi-Workspace RAG Chat & Document Analysis",
};

import { ErrorProvider } from "@/context/error-context";
import { SearchProvider } from "@/context/search-context";
import { TaskProvider } from "@/context/task-context";
import { ChatProvider } from "@/context/chat-context";
import { JobPanel } from "@/components/job-panel";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased`}
      >
        <ErrorProvider>
          <SearchProvider>
            <TaskProvider>
              <ChatProvider>
                {children}
                <JobPanel />
              </ChatProvider>
            </TaskProvider>
          </SearchProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
