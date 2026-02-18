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
    Activity,
    Trace
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

    return (
        <div className="space-y-6">
            {/* Mode Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                    ? "bg-amber-600/10 border-amber-500 text-white shadow-lg shadow-amber-600/5"
                                    : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10 hover:bg-white/[0.07]"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                                isActive ? "bg-amber-500 text-white" : "bg-white/5 text-gray-400 group-hover:text-gray-300"
                            )}>
                                <Icon size={16} />
                            </div>
                            <div className="font-bold text-[11px] mb-0.5">{m.label}</div>
                            <div className="text-[9px] opacity-60 leading-tight">{m.desc}</div>

                            {isActive && (
                                <div className="absolute top-0 right-0 p-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Mode-Specific Parameters */}
            <Card className="bg-white/5 border-white/5">
                <CardContent className="pt-6 space-y-6">
                    {currentMode === 'thinking' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="runtime.thinking.max_loops"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Max Loops</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 3}</span>
                                        </div>
                                        <Slider min={1} max={10} step={1} value={[field.value || 3]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.thinking.reflection_depth"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Reflection Depth</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 2}</span>
                                        </div>
                                        <Slider min={1} max={5} step={1} value={[field.value || 2]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.thinking.confidence_threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Confidence Threshold</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 0.8}</span>
                                        </div>
                                        <Slider min={0} max={1} step={0.05} value={[field.value || 0.8]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {currentMode === 'deep' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="runtime.deep.max_loops"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Max Loops</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 5}</span>
                                        </div>
                                        <Slider min={1} max={15} step={1} value={[field.value || 5]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.deep.multi_query_limit"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Multi-Query Limit</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 3}</span>
                                        </div>
                                        <Slider min={1} max={10} step={1} value={[field.value || 3]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.deep.backtracking_enabled"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Backtracking</FormLabel>
                                        </div>
                                        <Switch checked={field.value !== false} onCheckedChange={field.onChange} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {currentMode === 'blending' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="runtime.blending.query_variants"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Query Variants</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 2}</span>
                                        </div>
                                        <Slider min={1} max={5} step={1} value={[field.value || 2]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="runtime.blending.answer_variants"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-amber-500/80">Answer Variants</FormLabel>
                                            <span className="text-[10px] text-white/40">{field.value || 2}</span>
                                        </div>
                                        <Slider min={1} max={5} step={1} value={[field.value || 2]} onValueChange={(v) => field.onChange(v[0])} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Common Runtime Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <FormField
                            control={form.control}
                            name="runtime.stream_thoughts"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border border-white/5 p-3 bg-white/[0.02]">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-3 h-3 text-amber-400" />
                                            <FormLabel className="text-[11px]">Stream Thoughts</FormLabel>
                                        </div>
                                        <FormDescription className="text-[9px]">See internal reasoning LIVE</FormDescription>
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
                                <FormItem className="flex items-center justify-between rounded-lg border border-white/5 p-3 bg-white/[0.02]">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-3 h-3 text-amber-400" />
                                            <FormLabel className="text-[11px]">Detailed Tracing</FormLabel>
                                        </div>
                                        <FormDescription className="text-[9px]">Deep observability for RAG</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'debug'}
                                            onCheckedChange={(v) => field.onChange(v ? 'debug' : 'info')}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
