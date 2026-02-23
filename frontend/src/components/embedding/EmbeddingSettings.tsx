'use client';

import React, { useEffect } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { MODEL_DIMENSIONS, EmbeddingConfig } from '@/lib/schemas/embedding';
import { cn } from '@/lib/utils';
import {
    Cloud, Server, Cpu, Brain, Database,
    Info, ShieldCheck, ChevronDown
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface EmbeddingSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function EmbeddingProviderSelector({ form }: EmbeddingSettingsProps) {
    const { setValue, control } = form;
    const currentProvider = useWatch({
        control,
        name: 'embedding.provider'
    });

    const providers = [
        { id: 'openai', label: 'OpenAI', icon: Cloud, defaultModel: 'text-embedding-3-small' },
        { id: 'azure', label: 'Azure OpenAI', icon: ShieldCheck, defaultModel: 'text-embedding-ada-002' },
        { id: 'voyage', label: 'Voyage AI', icon: Cloud, defaultModel: 'voyage-large-2' },
        { id: 'cohere', label: 'Cohere', icon: Cloud, defaultModel: 'embed-english-v3.0' },
        { id: 'huggingface', label: 'HuggingFace', icon: Server, defaultModel: 'bge-base-en-v1.5' },
        { id: 'ollama', label: 'Ollama', icon: Cpu, defaultModel: 'nomic-embed-text' },
        { id: 'llama', label: 'LLaMA Local', icon: Cpu, defaultModel: 'llama-embedding-7b' },
        { id: 'cdp2', label: 'LLaMA CDP2', icon: Database, defaultModel: 'cdp2-embedding-base' },
        { id: 'vlm', label: 'Multimodal VLM', icon: Brain, defaultModel: 'vlm-clip-vit-b32' },
    ];

    const handleProviderSelect = (p: typeof providers[0]) => {
        // Set provider first to update UI highlight immediately
        setValue('embedding.provider', p.id as any);
        // Set default model for this provider
        setValue('embedding.model', p.defaultModel as any);

        // Reset/Set provider specific defaults
        if (p.id === 'openai') {
            setValue('embedding.batch_size', 32);
            setValue('embedding.timeout_ms', 30000);
        } else if (p.id === 'azure') {
            setValue('embedding.batch_size', 32);
            setValue('embedding.timeout_ms', 30000);
            setValue('embedding.deployment_name', 'text-embedding-ada-002');
            setValue('embedding.api_version', '2023-05-15');
        } else if (p.id === 'cohere') {
            setValue('embedding.input_type', 'search_query');
            setValue('embedding.truncate', 'END');
        } else if (p.id === 'huggingface') {
            setValue('embedding.device', 'cpu');
            setValue('embedding.normalize_embeddings', true);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {providers.map((p) => {
                const Icon = p.icon;
                const isActive = currentProvider === p.id;

                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderSelect(p)}
                        className={cn(
                            "p-3 rounded-xl border text-left transition-all group",
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
                        <div className="font-bold text-[11px] mb-0.5">{p.label}</div>
                    </button>
                );
            })}
        </div>
    );
}

const PROVIDER_MODELS: Record<string, string[]> = {
    openai: ['text-embedding-3-small', 'text-embedding-3-large'],
    azure: ['text-embedding-ada-002', 'text-embedding-3-large'],
    voyage: ['voyage-large-2', 'voyage-code-2'],
    cohere: ['embed-english-v3.0', 'embed-multilingual-v3.0'],
    huggingface: ['sentence-transformers/all-MiniLM-L6-v2', 'bge-base-en-v1.5', 'bge-large-en-v1.5'],
    ollama: ['mxbai-embed-large', 'nomic-embed-text'],
    llama: ['llama-embedding-7b', 'llama-embedding-13b'],
    cdp2: ['cdp2-embedding-base', 'cdp2-embedding-large'],
    vlm: ['vlm-clip-vit-b32', 'vlm-clip-vit-l14'],
};

export function EmbeddingModelSelector({ form }: EmbeddingSettingsProps) {
    const { watch, setValue } = form;
    const provider = watch('embedding.provider');
    const currentModel = watch('embedding.model');
    const models = React.useMemo(() => PROVIDER_MODELS[provider] || [], [provider]);

    const inputClass = "w-full bg-secondary border border-border rounded-xl px-3 py-2 text-caption focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-foreground";
    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";

    useEffect(() => {
        if (models.length > 0 && !models.includes(currentModel)) {
            setValue('embedding.model', models[0] as EmbeddingConfig['model']);
        }
    }, [provider, models, currentModel, setValue]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className={labelClass}>Model</label>
                <Select
                    onValueChange={(v) => setValue('embedding.model', v as EmbeddingConfig['model'])}
                    value={currentModel}
                >
                    <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                        {models.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className={labelClass}>Dimension (Derived)</label>
                <div className={cn(inputClass, "bg-muted text-muted-foreground/60 cursor-not-allowed flex items-center")}>
                    {MODEL_DIMENSIONS[currentModel] || '---'}
                </div>
            </div>
        </div>
    );
}

export function EmbeddingConfigDetails({ form }: EmbeddingSettingsProps) {
    const { register, watch, setValue } = form;
    const provider = watch('embedding.provider');

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption focus:ring-1 focus:ring-blue-500 outline-none transition-all";
    const labelClass = "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block";

    switch (provider) {
        case 'openai':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Batch Size</label>
                            <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Timeout (ms)</label>
                            <input type="number" {...register('embedding.timeout_ms', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Retry Limit</label>
                            <input type="number" {...register('embedding.retry_limit', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>API Key Ref</label>
                            <input {...register('embedding.api_key_ref')} className={inputClass} placeholder="e.g. OPENAI_API_KEY" />
                        </div>
                    </div>
                </div>
            );
        case 'azure':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 lg:col-span-2">
                        <label className={labelClass}>Deployment Name</label>
                        <input {...register('embedding.deployment_name')} className={inputClass} placeholder="e.g., text-emb-small-001" />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>API Version</label>
                        <input {...register('embedding.api_version')} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                        <label className={labelClass}>Timeout (ms)</label>
                        <input type="number" {...register('embedding.timeout_ms', { valueAsNumber: true })} className={inputClass} />
                    </div>
                </div>
            );
        case 'cohere':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs">
                        <label className={labelClass}>Input Type</label>
                        <Select
                            onValueChange={(v) => setValue('embedding.input_type', v as any)}
                            value={watch('embedding.input_type')}
                        >
                            <SelectTrigger className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="search_query">Search Query</SelectItem>
                                <SelectItem value="search_document">Search Document</SelectItem>
                                <SelectItem value="classification">Classification</SelectItem>
                                <SelectItem value="clustering">Clustering</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Truncate</label>
                        <Select
                            onValueChange={(v) => setValue('embedding.truncate', v as any)}
                            value={watch('embedding.truncate')}
                        >
                            <SelectTrigger className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                <SelectItem value="START">Start</SelectItem>
                                <SelectItem value="END">End</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                </div>
            );
        case 'huggingface':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className={labelClass}>Device</label>
                        <Select
                            onValueChange={(v) => setValue('embedding.device', v as any)}
                            value={watch('embedding.device')}
                        >
                            <SelectTrigger className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cpu">CPU</SelectItem>
                                <SelectItem value="cuda">CUDA</SelectItem>
                                <SelectItem value="mps">MPS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Max Seq Length</label>
                        <input type="number" {...register('embedding.max_sequence_length', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" {...register('embedding.normalize_embeddings')} id="norm_emb" className="w-4 h-4 rounded border-border bg-secondary" />
                        <label htmlFor="norm_emb" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Normalize</label>
                    </div>
                </div>
            );
        case 'llama':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 lg:col-span-2">
                        <label className={labelClass}>Model Path</label>
                        <input {...register('embedding.model_path')} className={inputClass} placeholder="/path/to/model.gguf" />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Quantization</label>
                        <Select
                            onValueChange={(v) => setValue('embedding.quantization', v as any)}
                            value={watch('embedding.quantization')}
                        >
                            <SelectTrigger className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fp16">Full (fp16)</SelectItem>
                                <SelectItem value="int8">Int8</SelectItem>
                                <SelectItem value="int4">Int4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Device Map</label>
                        <input {...register('embedding.device_map')} className={inputClass} placeholder="auto" />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                </div>
            );
        case 'cdp2':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 lg:col-span-2">
                        <label className={labelClass}>Checkpoint Path</label>
                        <input {...register('embedding.checkpoint_path')} className={inputClass} />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" {...register('embedding.enable_finetune')} id="tune" className="w-4 h-4 rounded border-border bg-secondary" />
                        <label htmlFor="tune" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Enable Finetune</label>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" {...register('embedding.embedding_cache')} id="cache" className="w-4 h-4 rounded border-border bg-secondary" />
                        <label htmlFor="cache" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Embedding Cache</label>
                    </div>
                </div>
            );
        case 'vlm':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className={labelClass}>Input Modalities</label>
                        <Select
                            onValueChange={(v) => setValue('embedding.input_modalities', v as any)}
                            value={watch('embedding.input_modalities')}
                        >
                            <SelectTrigger className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text Only</SelectItem>
                                <SelectItem value="image">Image Only</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Image Res</label>
                        <input type="number" {...register('embedding.image_resolution', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Batch Size</label>
                        <input type="number" {...register('embedding.batch_size', { valueAsNumber: true })} className={inputClass} />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" {...register('embedding.normalize_embeddings')} id="norm_vlm" className="w-4 h-4 rounded border-border bg-secondary" />
                        <label htmlFor="norm_vlm" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Normalize</label>
                    </div>
                </div>
            );
        default:
            return (
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                    <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                        Default settings applied for {provider}. Standard batch processing and timeouts enabled.
                    </p>
                </div>
            );
    }
}
