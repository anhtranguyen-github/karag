'use client';

import React from 'react';
import { Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChunkCardProps {
    chunk: {
        id: string;
        text: string;
        index: number;
        metadata: Record<string, unknown>;
    };
    className?: string;
}

export function ChunkCard({ chunk, className }: ChunkCardProps) {
    return (
        <div className={cn(
            "bg-[#121214] rounded-xl border border-white/5 overflow-hidden hover:border-blue-500/20 transition-all group",
            className
        )}>
            <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 text-tiny font-bold">
                        #{chunk.index + 1}
                    </div>
                    <span className="text-tiny text-gray-500  tracking-wider">
                        ID: {chunk.id.slice(0, 8)}...
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-tiny text-gray-600">
                        <Type size={10} />
                        <span>{chunk.text.length} chars</span>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <p className="text-caption text-gray-300 leading-relaxed line-clamp-6 group-hover:line-clamp-none transition-all duration-500">
                    {chunk.text}
                </p>
            </div>

            {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 flex flex-wrap gap-2">
                    {Object.entries(chunk.metadata).map(([key, value]) => {
                        if (typeof value === 'object' || key === 'text' || key === 'doc_id' || key === 'index') return null;
                        return (
                            <div key={key} className="px-2 py-0.5 rounded bg-white/5 text-tiny text-gray-500 border border-white/5">
                                <span className="text-gray-600  mr-1">{key}:</span>
                                {String(value)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
