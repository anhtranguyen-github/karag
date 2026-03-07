'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';
import { RuntimeSettings } from '@/lib/schemas/runtime';
import {
    Zap,
    Brain,
    Microscope,
    Atom,
    Eye,
    Activity
} from 'lucide-react';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormDescription
} from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import { RUNTIME_SCHEMAS } from '@/lib/schemas/ui-schemas';
import { SchemaForm } from '@/components/ui/schema-form';

interface ExecutionSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function ExecutionSettings({ form }: ExecutionSettingsProps) {
    const { watch, setValue } = form;
    const currentMode = watch('runtime.mode');

    const modes = [
        { id: 'auto', label: 'Auto', icon: Activity, desc: 'Balanced mode with automatic depth' },
        { id: 'fast', label: 'Fast', icon: Zap, desc: 'Shortest path for direct answers' },
        { id: 'think', label: 'Think', icon: Brain, desc: 'Extra planning for complex tasks' },
        { id: 'deep', label: 'Deep', icon: Microscope, desc: 'Broader search and longer report-style responses' },
    ];

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";

    return (
        <div className="space-y-0 pb-10">
            {/* Mode Selector */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Activity size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Execution Engine</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Select the primary response mode for this workspace</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {modes.map((m) => {
                        const Icon = m.icon;
                        const isActive = currentMode === m.id;

                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setValue('runtime.mode', m.id as RuntimeSettings['mode'])}
                                className={cn(
                                    "p-3 rounded-xl border text-left transition-all group relative overflow-hidden",
                                    isActive
                                        ? "bg-indigo-500/10 border-indigo-500 text-foreground shadow-lg shadow-indigo-500/5"
                                        : "bg-secondary/50 border-border text-muted-foreground hover:border-indigo-500/30 hover:bg-secondary"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                                    isActive ? "bg-indigo-500 text-white" : "bg-card border border-border text-muted-foreground group-hover:text-foreground"
                                )}>
                                    <Icon size={16} />
                                </div>
                                <div className="font-bold text-[11px] mb-0.5">{m.label}</div>
                                <div className="text-[9px] opacity-60 leading-tight">{m.desc}</div>

                                {isActive && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-6 px-2">
                    {/* Mode-Specific Parameters */}
                    {currentMode === 'think' && (
                        <div className="animate-in fade-in duration-300">
                            <SchemaForm schema={RUNTIME_SCHEMAS.think} gridCols={2} />
                        </div>
                    )}

                    {currentMode === 'deep' && (
                        <div className="animate-in fade-in duration-300">
                            <SchemaForm schema={RUNTIME_SCHEMAS.deep} gridCols={2} />
                        </div>
                    )}

                    {/* Common Runtime Toggles */}
                    <div className="border-t border-border/20 pt-8">
                        <SchemaForm schema={RUNTIME_SCHEMAS.common} gridCols={2} />
                    </div>
                </div>
            </div>
        </div>
    );
}
