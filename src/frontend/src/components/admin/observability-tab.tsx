import React from 'react';
import { Loader2, Activity } from 'lucide-react';

interface ObservabilityTabProps {
    rawMetrics: string | null;
    metricsError: string | null;
}

export function ObservabilityTab({ rawMetrics, metricsError }: ObservabilityTabProps) {
    if (metricsError) return <div className="p-20 text-center text-red-500 font-bold">{metricsError}</div>;

    return (
        <div className="space-y-6">
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" />
                        Raw Metrics Stream
                    </h3>
                </div>
                <div className="flex-1 overflow-auto bg-black/50 rounded-xl p-4 font-mono text-[10px] text-gray-400">
                    <pre>{rawMetrics || <div className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Loading telemetry...</div>}</pre>
                </div>
            </div>
        </div>
    );
}
