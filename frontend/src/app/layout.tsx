import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Karag",
    description: "Your knowledge workspace",
};

import { JobMonitor } from "@/components/ui/job-monitor";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased font-sans text-foreground bg-background">
                {children}
                <JobMonitor />
            </body>
        </html>
    );
}
