'use client';

import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { MODEL_DIMENSIONS } from '@/lib/schemas/embedding';
import { cn } from '@/lib/utils';
import {
    Cloud, Server, Cpu, Brain, Database,
    Settings2, Info, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface EmbeddingSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function EmbeddingProviderSelector({ form }: EmbeddingSettingsProps) {
    const { watch, setValue } = form;
    const currentProvider = watch('embedding.provider');

    const providers = [
        { id: 'openai', label: 'OpenAI', icon: Cloud, desc: 'Industry standard APIs' },
        { id: 'azure', label: 'Azure OpenAI', icon: ShieldCheck, desc: 'Enterprise-grade hosting' },
        { id: 'voyage', label: 'Voyage AI', icon: Cloud, desc: 'Top-tier retrieval models' },
        { id: 'cohere', label: 'Cohere', icon: Cloud, desc: 'Specialized search embeddings' },
        { id: 'huggingface', label: 'HuggingFace', icon: Server, desc: 'Local or API models' },
        { id: 'ollama', label: 'Ollama', icon: Cpu, desc: 'Local self-hosted models' },
        { id: 'llama', label: 'LLaMA Local', icon: Cpu, desc: 'Native LLaMA embeddings' },
        { id: 'cdp2', label: 'LLaMA CDP2', icon: Database, desc: 'Internal custom models' },
        { id: 'vlm', label: 'Multimodal VLM', icon: Brain, desc: 'Text & Visual embeddings' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {providers.map((p) => {
                const Icon = p.icon;
                const isActive = currentProvider === p.id;

                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setValue('embedding', { provider: p.id } as any)}
                        className={cn(
                            "p-3 rounded-xl border text-left transition-all group",
                            isActive
                                ? "bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-600/5"
                                : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10 hover:bg-white/[0.07]"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                            isActive ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 group-hover:text-gray-300"
                        )}>
                            <Icon size={16} />
                        </div>
                        <div className="font-bold text-[11px] mb-0.5">{p.label}</div>
                        <div className="text-[9px] opacity-60 leading-tight">{p.desc}</div>
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
    const { register, watch, setValue } = form;
    const provider = watch('embedding.provider');
    const currentModel = watch('embedding.model');
    const models = PROVIDER_MODELS[provider] || [];

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption focus:ring-1 focus:ring-blue-500 outline-none transition-all";
    const labelClass = "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block";

    // Update model if provider changes and current model is not in list
    useEffect(() => {
        if (models.length > 0 && !models.includes(currentModel)) {
            setValue('embedding.model', models[0] as any);
        }
    }, [provider, models, currentModel, setValue]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className={labelClass}>Model</label>
                <select {...register('embedding.model')} className={inputClass}>
                    {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1">
                <label className={labelClass}>Dimension (Derived)</label>
                <div className={cn(inputClass, "bg-white/10 text-gray-400 cursor-not-allowed flex items-center")}>
                    {MODEL_DIMENSIONS[currentModel] || '---'}
                </div>
            </div>
        </div>
    );
}

export function EmbeddingConfigDetails({ form }: EmbeddingSettingsProps) {
    const { register, watch } = form;
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
                        <select {...register('embedding.input_type')} className={inputClass}>
                            <option value="search_query">Search Query</option>
                            <option value="search_document">Search Document</option>
                            <option value="classification">Classification</option>
                            <option value="clustering">Clustering</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Truncate</label>
                        <select {...register('embedding.truncate')} className={inputClass}>
                            <option value="NONE">None</option>
                            <option value="START">Start</option>
                            <option value="END">End</option>
                        </select>
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
                        <select {...register('embedding.device')} className={inputClass}>
                            <option value="cpu">CPU</option>
                            <option value="cuda">CUDA</option>
                            <option value="mps">MPS</option>
                        </select>
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
                        <input type="checkbox" {...register('embedding.normalize_embeddings')} id="norm_emb" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                        <label htmlFor="norm_emb" className="text-[10px] font-bold text-gray-400">NORMALIZE</label>
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
                        <select {...register('embedding.quantization')} className={inputClass}>
                            <option value="fp16">Full (fp16)</option>
                            <option value="int8">Int8</option>
                            <option value="int4">Int4</option>
                        </select>
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
                        <input type="checkbox" {...register('embedding.enable_finetune')} id="tune" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                        <label htmlFor="tune" className="text-[10px] font-bold text-gray-400">ENABLE FINETUNE</label>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" {...register('embedding.embedding_cache')} id="cache" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                        <label htmlFor="cache" className="text-[10px] font-bold text-gray-400">EMBEDDING CACHE</label>
                    </div>
                </div>
            );
        case 'vlm':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className={labelClass}>Input Modalities</label>
                        <select {...register('embedding.input_modalities')} className={inputClass}>
                            <option value="text">Text Only</option>
                            <option value="image">Image Only</option>
                            <option value="both">Both</option>
                        </select>
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
                        <input type="checkbox" {...register('embedding.normalize_embeddings')} id="norm_vlm" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                        <label htmlFor="norm_vlm" className="text-[10px] font-bold text-gray-400">NORMALIZE</label>
                    </div>
                </div>
            );
        default:
            return (
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                    <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-200/60 leading-relaxed">
                        Default settings applied for {provider}. Standard batch processing and timeouts enabled.
                    </p>
                </div>
            );
    }
}
