import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Karag",
    description: "Your knowledge workspace",
};

import { ErrorProvider } from "@/context/error-context";
import { TaskProvider } from "@/context/task-context";
import { JobMonitor } from "@/components/ui/job-monitor";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full">
            <body className="antialiased font-sans text-foreground bg-background">
                <ErrorProvider>
                    <TaskProvider>
                        {children}
                        <JobMonitor />
                    </TaskProvider>
                </ErrorProvider>
            </body>
        </html>
    );
}
