import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
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
import { Bot, Zap, Cpu, ScanEye, Code2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationConfig } from '@/lib/schemas/generation';
import { SchemaForm } from '@/components/ui/schema-form';
import { GENERATION_SCHEMAS } from '@/lib/schemas/ui-schemas';

const GENERATION_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', icon: Zap, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4.1'] },
    { id: 'azure', name: 'Azure OpenAI', icon: Bot, models: ['gpt-4', 'gpt-4o'] },
    { id: 'llama', name: 'Local LLaMA', icon: Cpu, models: ['llama-3-8b-instruct', 'llama-3-70b-instruct'] },
    { id: 'cdp2', name: 'LLaMA CDP2', icon: Code2, models: ['cdp2-llm-base', 'cdp2-llm-large'] },
    { id: 'vlm', name: 'Local VLM', icon: ScanEye, models: ['llava-1.6', 'llava-next', 'gpt-4o'] },
] as const;

import { useWatch } from 'react-hook-form';

interface GenerationSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function GenerationSettings({ form }: GenerationSettingsProps) {
    'use no memo';
    const { control, setValue } = form;
    const provider = useWatch({
        control,
        name: 'generation.provider'
    });
    const [localProvider, setLocalProvider] = React.useState(provider);

    // Keep local state in sync if provider changes from outside
    React.useEffect(() => {
        setLocalProvider(provider);
    }, [provider]);

    const selectedProvider = useMemo(() =>
        GENERATION_PROVIDERS.find(p => p.id === localProvider)
        , [localProvider]);

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";
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
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                    {GENERATION_PROVIDERS.map((p) => {
                        const Icon = p.icon;
                        const isSelected = localProvider === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    setLocalProvider(p.id as any);
                                    setValue('generation.provider', p.id as any);
                                    setValue('generation.model', p.models[0] as any);
                                    setValue('generation.temperature', 0.7);
                                    setValue('generation.max_output_tokens', 2048);
                                    setValue('generation.streaming', true);

                                    if (p.id === 'azure') {
                                        setValue('generation.deployment_name' as any, 'default');
                                        setValue('generation.api_version' as any, '2024-02-15-preview');
                                    } else if (p.id === 'llama' || p.id === 'cdp2') {
                                        setValue('generation.repeat_penalty' as any, 1.1);
                                        setValue('generation.top_k' as any, 40);
                                    } else if (p.id === 'vlm') {
                                        setValue('generation.input_modalities' as any, 'both');
                                        setValue('generation.image_max_resolution' as any, 1024);
                                    }
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

                <div className="px-2">
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
                </div>
            </div>

            {/* 2. Core Hyperparameters & Provider Specific */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Zap size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Configuration</h3>
                    </div>
                </div>

                <div className="px-2">
                    <SchemaForm schema={GENERATION_SCHEMAS[localProvider] || GENERATION_SCHEMAS['openai']} gridCols={2} />
                </div>
            </div>
        </div>
    );
}
