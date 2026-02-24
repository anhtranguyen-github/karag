import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Karag",
    description: "Your knowledge workspace",
};

import { ErrorProvider } from "@/context/error-context";
import { ToastProvider } from "@/context/toast-context";
import { TaskProvider } from "@/context/task-context";
import { JobPanel } from "@/components/job-panel";
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning className="h-full">
            <body className="antialiased font-sans text-foreground bg-background h-full" suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ErrorProvider>
                        <ToastProvider>
                            <TaskProvider>
                                {children}
                                <JobPanel />
                            </TaskProvider>
                        </ToastProvider>
                    </ErrorProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
