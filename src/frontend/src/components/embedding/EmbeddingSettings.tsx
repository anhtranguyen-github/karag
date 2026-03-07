'use client';

import React, { useEffect } from 'react';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { MODEL_DIMENSIONS, EmbeddingConfig } from '@/lib/schemas/embedding';
import { cn } from '@/lib/utils';
import {
    Cloud, Server, Cpu, Brain, Database,
    Info, ShieldCheck, Settings2
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFormContext } from 'react-hook-form';

export function EmbeddingProviderSelector() {
    'use no memo';
    const { setValue, watch } = useFormContext<CreateWorkspaceInput>();
    const [localProvider, setLocalProvider] = React.useState(watch('embedding.dense.provider'));

    const providers = [
        { id: 'openai', label: 'OpenAI', icon: Cloud, defaultModel: 'text-embedding-3-small' },
        { id: 'azure', label: 'Azure OpenAI', icon: ShieldCheck, defaultModel: 'text-embedding-ada-002' },
        { id: 'voyage', label: 'Voyage AI', icon: Cloud, defaultModel: 'voyage-large-2' },
        { id: 'cohere', label: 'Cohere', icon: Cloud, defaultModel: 'embed-english-v3.0' },
        { id: 'huggingface', label: 'HuggingFace', icon: Server, defaultModel: 'sentence-transformers/all-MiniLM-L6-v2' },
        { id: 'ollama', label: 'Ollama', icon: Cpu, defaultModel: 'nomic-embed-text' },
        { id: 'llama', label: 'LLaMA Local', icon: Cpu, defaultModel: 'llama-embedding-7b' },
        { id: 'cdp2', label: 'LLaMA CDP2', icon: Database, defaultModel: 'cdp2-embedding-base' },
        { id: 'vlm', label: 'Multimodal VLM', icon: Brain, defaultModel: 'vlm-clip-vit-b32' },
    ];

    const handleProviderChange = (providerId: string, defaultModel: string) => {
        setLocalProvider(providerId as any);
        setValue('embedding.dense.provider', providerId as any);

        // Set default model for this provider
        setValue('embedding.dense.model', defaultModel as any);
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {providers.map((p) => {
                const Icon = p.icon;
                const isActive = localProvider === p.id;

                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderChange(p.id, p.defaultModel)}
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

export function EmbeddingModelSelector() {
    'use no memo';
    const { setValue, watch } = useFormContext<CreateWorkspaceInput>();
    const provider = watch('embedding.dense.provider');
    const currentModel = watch('embedding.dense.model');
    const currentDim = watch('embedding.dense.dimensions' as any);
    const models = React.useMemo(() => PROVIDER_MODELS[provider] || [], [provider]);

    const inputClass = "w-full bg-secondary border border-border rounded-xl px-3 py-2 text-caption focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-foreground";
    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";

    const dimsData = MODEL_DIMENSIONS[currentModel];
    const hasMultipleDims = Array.isArray(dimsData);

    useEffect(() => {
        if (models.length > 0 && !models.includes(currentModel)) {
            setValue('embedding.dense.model', models[0] as any);
        }
    }, [provider, models, currentModel, setValue]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className={labelClass}>Model</label>
                <Select
                    onValueChange={(v) => setValue('embedding.dense.model', v as any)}
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
                <label className={labelClass}>Dimensions</label>
                {hasMultipleDims ? (
                    <Select
                        onValueChange={(v) => setValue('embedding.dense.dimensions' as any, parseInt(v))}
                        value={currentDim?.toString()}
                    >
                        <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Select Dim" />
                        </SelectTrigger>
                        <SelectContent>
                            {(dimsData as number[]).map(d => (
                                <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className={cn(inputClass, "bg-muted text-muted-foreground/60 cursor-not-allowed flex items-center")}>
                        {dimsData || '---'}
                    </div>
                )}
            </div>
        </div>
    );
}

import { SchemaForm } from '@/components/ui/schema-form';
import { EMBEDDING_SCHEMAS } from '@/lib/schemas/ui-schemas';

export function SparseEmbeddingSettings() {
    'use no memo';
    const schema = EMBEDDING_SCHEMAS.sparse;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Sparse Vector Settings</h3>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
                <SchemaForm schema={schema} gridCols={2} />
            </div>
        </div>
    );
}

export function EmbeddingConfigDetails() {
    'use no memo';
    const { watch } = useFormContext<CreateWorkspaceInput>();
    const provider = watch('embedding.dense.provider');

    const schema = EMBEDDING_SCHEMAS[provider] || EMBEDDING_SCHEMAS.dense_common;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 mt-6 pt-6 border-t border-border">
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Settings2 size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-foreground">Advanced Dense Config</h3>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                    <SchemaForm schema={schema} gridCols={2} />
                </div>
            </div>

            <SparseEmbeddingSettings />
        </div>
    );
}
