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
import { Bot, Zap, Cpu, ScanEye, Code2 } from 'lucide-react';
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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GENERATION_PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = provider === p.id;
                    return (
                        <Card
                            key={p.id}
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary/50",
                                isSelected && "border-primary ring-1 ring-primary"
                            )}
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
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.models.length} models</div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="generation.model"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Model</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-9">
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20">
                            <div className="space-y-0.5">
                                <FormLabel className="text-xs">Streaming</FormLabel>
                                <FormDescription className="text-[10px]">Real-time generation</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="generation.temperature"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center mb-1">
                                <FormLabel className="text-xs">Temperature</FormLabel>
                                <span className="text-[10px] font-mono text-primary">{field.value}</span>
                            </div>
                            <FormControl>
                                <Slider min={0} max={2} step={0.1} value={[field.value]} onValueChange={(v) => field.onChange(v[0])} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="generation.max_output_tokens"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Max Output Tokens</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                <FormField
                    control={form.control}
                    name="generation.presence_penalty"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center mb-1">
                                <FormLabel className="text-xs">Presence Penalty</FormLabel>
                                <span className="text-[10px] font-mono">{field.value}</span>
                            </div>
                            <Slider min={-2} max={2} step={0.1} value={[field.value || 0]} onValueChange={(v) => field.onChange(v[0])} />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="generation.frequency_penalty"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center mb-1">
                                <FormLabel className="text-xs">Frequency Penalty</FormLabel>
                                <span className="text-[10px] font-mono">{field.value}</span>
                            </div>
                            <Slider min={-2} max={2} step={0.1} value={[field.value || 0]} onValueChange={(v) => field.onChange(v[0])} />
                        </FormItem>
                    )}
                />
                {(provider === 'llama' || provider === 'cdp2') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="generation.top_k"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Top K</FormLabel>
                                    <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="generation.repeat_penalty"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-center mb-1">
                                        <FormLabel className="text-xs">Repeat Penalty</FormLabel>
                                        <span className="text-[10px] font-mono">{field.value}</span>
                                    </div>
                                    <Slider min={0} max={2} step={0.05} value={[field.value || 1.1]} onValueChange={(v) => field.onChange(v[0])} />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
            </div>

            {provider === 'azure' && (
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="py-3">
                        <CardTitle className="text-xs font-semibold">Azure API Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        <FormField
                            control={form.control}
                            name="generation.deployment_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">Deployment Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-8 text-xs" placeholder="e.g. gpt-4o-deployment" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="generation.api_version"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">API Version</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-8 text-xs" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            )}

            {(provider === 'llama' || provider === 'vlm' || provider === 'cdp2') && (
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="py-3">
                        <CardTitle className="text-xs font-semibold">Hardware & Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        {provider === 'llama' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="generation.device"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px]">Compute Device</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                            <FormLabel className="text-[10px]">Quantization</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fp16">FP16</SelectItem>
                                                    <SelectItem value="int8">INT8</SelectItem>
                                                    <SelectItem value="int4">INT4</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-1">
                                    <FormLabel className="text-[10px]">Context Window (Read-only)</FormLabel>
                                    <div className="h-8 border rounded-md bg-muted/50 flex items-center px-3 text-xs text-muted-foreground">
                                        {form.watch('generation.model')?.includes('8b') ? '8192' : '32768'}
                                    </div>
                                </div>
                            </>
                        )}
                        {provider === 'cdp2' && (
                            <FormField
                                control={form.control}
                                name="generation.checkpoint_path"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Checkpoint Path</FormLabel>
                                        <Input {...field} className="h-8 text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}
                        {provider === 'vlm' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="generation.input_modalities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px]">Modalities</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                            <FormLabel className="text-[10px]">Max Image Res</FormLabel>
                                            <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
