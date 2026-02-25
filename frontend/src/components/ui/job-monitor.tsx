"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, ChevronDown } from "lucide-react";

interface Task {
    id: string;
    type: string;
    status: "pending" | "processing" | "completed" | "failed" | "canceled";
    progress: number;
    message: string;
    updated_at: string;
}

export function JobMonitor({ workspaceId }: { workspaceId?: string }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchTasks = async () => {
        try {
            const payload = await api.listTasksWorkspacesWorkspaceIdTasksGet({
                workspaceId: workspaceId!,
                limit: 5
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTasks((payload.data as any) || []);
        } catch (e) {
            console.error("Failed to fetch tasks", e);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchTasks, 5000);
        fetchTasks();
        return () => clearInterval(interval);
    }, [workspaceId]);

    const activeTasks = tasks.filter(t => t.status === "pending" || t.status === "processing");
    const hasActiveTasks = activeTasks.length > 0;

    if (tasks.length === 0) return null;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg transition-all duration-300 overflow-hidden",
            isExpanded ? "w-80" : "w-12 h-12 flex items-center justify-center cursor-pointer"
        )}
            onClick={() => !isExpanded && setIsExpanded(true)}
        >
            {!isExpanded ? (
                <div className="relative">
                    {hasActiveTasks ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                    )}
                    {activeTasks.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-background">
                            {activeTasks.length}
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex flex-col h-full max-h-[400px]">
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                        <span className="text-xs font-semibold flex items-center gap-2">
                            <Loader2 className={cn("w-3 h-3", hasActiveTasks && "animate-spin")} />
                            Tasks
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {tasks.map((task) => (
                            <div key={task.id} className="text-[11px] p-2 rounded border bg-muted/10 space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                    <span className="font-medium uppercase tracking-tight text-[10px] opacity-70">{task.type.replace(/_/g, " ")}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                                        task.status === "completed" ? "bg-green-100 text-green-700" :
                                            task.status === "failed" ? "bg-red-100 text-red-700" :
                                                task.status === "processing" ? "bg-blue-100 text-blue-700" :
                                                    "bg-gray-100 text-gray-700"
                                    )}>
                                        {task.status}
                                    </span>
                                </div>

                                <p className="truncate opacity-90">{task.message}</p>

                                {(task.status === "processing" || task.status === "pending") && (
                                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden mt-1">
                                        <div
                                            className="bg-primary h-full transition-all duration-500"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-2 border-t bg-muted/5 text-center">
                        <button
                            className="text-[10px] text-primary hover:underline"
                            onClick={fetchTasks}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
