"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function HealthStatus() {
    const [status, setStatus] = useState<"online" | "offline" | "loading">("loading");

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                // Use a standard fetch to the root endpoint
                const response = await fetch(baseUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    mode: 'cors'
                });

                if (response.ok) {
                    setStatus("online");
                } else {
                    setStatus("offline");
                }
            } catch (err) {
                setStatus("offline");
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border group transition-all duration-300 hover:border-indigo-500/30">
            <div className="relative">
                <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    status === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        status === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" :
                            "bg-amber-500"
                )} />
                {status === "online" && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-20" />
                )}
            </div>
            <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase transition-colors duration-300",
                status === "online" ? "text-emerald-500/80 group-hover:text-emerald-500" :
                    status === "offline" ? "text-red-500/80 group-hover:text-red-500" :
                        "text-amber-500/80"
            )}>
                {status === "online" ? "System Live" : status === "offline" ? "System Down" : "Syncing"}
            </span>
            <Activity size={10} className={cn(
                "ml-1 transition-colors duration-300",
                status === "online" ? "text-emerald-500/50 group-hover:text-emerald-500" :
                    status === "offline" ? "text-red-500/50 group-hover:text-red-500" :
                        "text-amber-500/50"
            )} />
        </div>
    );
}
