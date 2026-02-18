'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';
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
import { Card, CardContent } from '@/components/ui/card';

interface ExecutionSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function ExecutionSettings({ form }: ExecutionSettingsProps) {
    const { watch, setValue } = form;
    const currentMode = watch('runtime.mode');

    const modes = [
        { id: 'fast', label: 'Fast', icon: Zap, desc: 'Direct completion, minimal latency' },
        { id: 'thinking', label: 'Thinking', icon: Brain, desc: 'Internal reasoning loops' },
        { id: 'deep', label: 'Deep', icon: Microscope, desc: 'Multi-path tree-of-thought' },
        { id: 'blending', label: 'Blending', icon: Atom, desc: 'Multi-source synthesis' },
    ];

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";
    const subSectionClass = "mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300";
    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";

    return (
        <div className="space-y-0 pb-10">
            {/* Mode Selector */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Zap size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Execution Engine</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Select the primary reasoning mode for this workspace</p>
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
                                onClick={() => setValue('runtime.mode', m.id as any)}
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
                    {currentMode === 'thinking' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                            <FormField
                                control={form.control}
                                name="runtime.thinking.max_loops"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                            <FormLabel className={labelClass}>Max Loops</FormLabel>
                                            <span className="text-indigo-500 text-[10px] font-mono">{field.value || 3}</span>
                                        </div>
                                        <Slider min={1} max={10} step={1} value={[field.value || 3]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.thinking.reflection_depth"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                            <FormLabel className={labelClass}>Reflection Depth</FormLabel>
                                            <span className="text-indigo-500 text-[10px] font-mono">{field.value || 2}</span>
                                        </div>
                                        <Slider min={1} max={5} step={1} value={[field.value || 2]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {currentMode === 'deep' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                            <FormField
                                control={form.control}
                                name="runtime.deep.max_loops"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                            <FormLabel className={labelClass}>Multi-path Max Loops</FormLabel>
                                            <span className="text-indigo-500 text-[10px] font-mono">{field.value || 5}</span>
                                        </div>
                                        <Slider min={1} max={15} step={1} value={[field.value || 5]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.deep.multi_query_limit"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                            <FormLabel className={labelClass}>Query Expansion Limit</FormLabel>
                                            <span className="text-indigo-500 text-[10px] font-mono">{field.value || 3}</span>
                                        </div>
                                        <Slider min={1} max={10} step={1} value={[field.value || 3]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Common Runtime Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/20 pt-8">
                        <FormField
                            control={form.control}
                            name="runtime.stream_thoughts"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                            <FormLabel className="text-xs font-bold">Stream Thoughts</FormLabel>
                                        </div>
                                        <FormDescription className="text-[9px] text-muted-foreground">See internal reasoning LIVE</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="runtime.tracing.trace_level"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                            <FormLabel className="text-xs font-bold">Detailed Tracing</FormLabel>
                                        </div>
                                        <FormDescription className="text-[9px] text-muted-foreground">Deep observability for RAG</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'debug'}
                                            onCheckedChange={(v: boolean) => field.onChange(v ? 'debug' : 'info')}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
