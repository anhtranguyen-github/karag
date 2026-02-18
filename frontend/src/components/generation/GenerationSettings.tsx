import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Cpu, ScanEye, Code2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GENERATION_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', icon: Zap, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4.1'] },
    { id: 'azure', name: 'Azure OpenAI', icon: Bot, models: ['gpt-4', 'gpt-4o'] },
    { id: 'llama', name: 'Local LLaMA', icon: Cpu, models: ['llama-3-8b-instruct', 'llama-3-70b-instruct'] },
    { id: 'cdp2', name: 'LLaMA CDP2', icon: Code2, models: ['cdp2-llm-base', 'cdp2-llm-large'] },
    { id: 'vlm', name: 'Local VLM', icon: ScanEye, models: ['llava-1.6', 'llava-next', 'gpt-4o'] },
] as const;

interface GenerationSettingsProps {
    form: UseFormReturn<any>;
}

export function GenerationSettings({ form }: GenerationSettingsProps) {
    const provider = form.watch('generation.provider');

    const selectedProvider = useMemo(() =>
        GENERATION_PROVIDERS.find(p => p.id === provider)
        , [provider]);

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";
    const subSectionClass = "mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300";
    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";

    return (
        <div className="space-y-0 pb-10">
            {/* 1. Model Provider Selector */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Bot size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Generation Engine</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Select your primary LLM and base hyper-parameters</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                    {GENERATION_PROVIDERS.map((p) => {
                        const Icon = p.icon;
                        const isSelected = provider === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    form.setValue('generation', {
                                        provider: p.id,
                                        model: p.models[0],
                                        temperature: 0.7,
                                        max_output_tokens: 2048,
                                        streaming: true,
                                        presence_penalty: 0.0,
                                        frequency_penalty: 0.0,
                                        ...(p.id === 'azure' ? { deployment_name: '', api_version: '2024-02-15-preview' } : {}),
                                        ...(p.id === 'llama' || p.id === 'cdp2' ? { repeat_penalty: 1.1, top_k: 40 } : {}),
                                        ...(p.id === 'llama' ? { device: 'cpu', quantization: 'fp16' } : {}),
                                        ...(p.id === 'vlm' ? { input_modalities: 'both', image_max_resolution: 1024 } : {}),
                                    });
                                }}
                                className={cn(
                                    "p-3 rounded-xl border text-left transition-all group",
                                    isSelected
                                        ? "bg-indigo-500/10 border-indigo-500 text-foreground shadow-lg shadow-indigo-500/5"
                                        : "bg-secondary/50 border-border text-muted-foreground hover:border-indigo-500/30 hover:bg-secondary"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                                    isSelected ? "bg-indigo-500 text-white" : "bg-card border border-border text-muted-foreground group-hover:text-foreground"
                                )}>
                                    <Icon size={16} />
                                </div>
                                <div className="font-bold text-[11px] mb-0.5">{p.name}</div>
                                <div className="text-[9px] opacity-60 leading-tight">{p.models.length} models</div>
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                    <FormField
                        control={form.control}
                        name="generation.model"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Model</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs">
                                            <SelectValue placeholder="Select a model" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {selectedProvider?.models.map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="generation.streaming"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border mt-3">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-bold">Streaming Output</FormLabel>
                                    <p className="text-[9px] text-muted-foreground">Enable real-time tokens</p>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* 2. Core Hyperparameters */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Zap size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Sampling Parameters</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Fine-tune text generation randomness and length</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                    <FormField
                        control={form.control}
                        name="generation.temperature"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                    <FormLabel className={labelClass}>Temperature</FormLabel>
                                    <span className="text-indigo-500 text-[10px] font-mono">{field.value}</span>
                                </div>
                                <FormControl>
                                    <Slider min={0} max={2} step={0.1} value={[field.value]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="generation.max_output_tokens"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Max Output Tokens</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="generation.presence_penalty"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                    <FormLabel className={labelClass}>Presence Penalty</FormLabel>
                                    <span className="text-indigo-500 text-[10px] font-mono">{field.value}</span>
                                </div>
                                <Slider min={-2} max={2} step={0.1} value={[field.value || 0]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="generation.frequency_penalty"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                    <FormLabel className={labelClass}>Frequency Penalty</FormLabel>
                                    <span className="text-indigo-500 text-[10px] font-mono">{field.value}</span>
                                </div>
                                <Slider min={-2} max={2} step={0.1} value={[field.value || 0]} onValueChange={(v: number[]) => field.onChange(v[0])} />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* 3. Provider Specific / Advanced */}
            {(provider === 'azure' || provider === 'llama' || provider === 'vlm' || provider === 'cdp2') && (
                <div className={cn(sectionClass, "bg-indigo-500/5")}>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                            <Settings2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Hardware & API Config</h3>
                            <p className="text-[10px] text-muted-foreground font-medium">Platform specific optimizations</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                        {provider === 'azure' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="generation.deployment_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Deployment Name</FormLabel>
                                            <Input {...field} className="h-9 rounded-xl bg-background border-border text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="generation.api_version"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>API Version</FormLabel>
                                            <Input {...field} className="h-9 rounded-xl bg-background border-border text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {provider === 'llama' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="generation.device"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Compute Device</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cpu">CPU</SelectItem>
                                                    <SelectItem value="cuda">CUDA</SelectItem>
                                                    <SelectItem value="mps">MPS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="generation.quantization"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Quantization</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fp16">FP16</SelectItem>
                                                    <SelectItem value="int8">INT8</SelectItem>
                                                    <SelectItem value="int4">INT4</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {provider === 'vlm' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="generation.input_modalities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Modalities</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="image">Image</SelectItem>
                                                    <SelectItem value="both">Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="generation.image_max_resolution"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Max Image Res</FormLabel>
                                            <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
