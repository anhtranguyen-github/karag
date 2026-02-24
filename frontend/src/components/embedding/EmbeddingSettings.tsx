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
    const [localProvider, setLocalProvider] = React.useState(watch('embedding.provider'));

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

    const handleProviderChange = (providerId: string, defaultModel: string) => {
        setLocalProvider(providerId as any);
        setValue('embedding.provider', providerId as any);

        // Set default model for this provider
        setValue('embedding.model', defaultModel as any);

        // Reset/Set provider specific defaults
        if (providerId === 'openai') {
            setValue('embedding.batch_size', 32);
            setValue('embedding.timeout_ms', 30000);
        } else if (providerId === 'azure') {
            setValue('embedding.batch_size', 32);
            setValue('embedding.timeout_ms', 30000);
            setValue('embedding.deployment_name', 'text-embedding-ada-002');
            setValue('embedding.api_version', '2023-05-15');
        } else if (providerId === 'cohere') {
            setValue('embedding.input_type', 'search_query');
            setValue('embedding.truncate', 'END');
        } else if (providerId === 'huggingface') {
            setValue('embedding.device', 'cpu');
            setValue('embedding.normalize_embeddings', true);
        }
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
    const { setValue, control, watch } = useFormContext<CreateWorkspaceInput>();
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

import { SchemaForm } from '@/components/ui/schema-form';
import { EMBEDDING_SCHEMAS } from '@/lib/schemas/ui-schemas';

export function EmbeddingConfigDetails() {
    'use no memo';
    const { watch } = useFormContext<CreateWorkspaceInput>();
    const provider = watch('embedding.provider');

    const schema = EMBEDDING_SCHEMAS[provider] || [];

    if (!schema.length) {
        return (
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4 mt-6">
                <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    Standard parameters will be applied for {provider}.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
                <Settings2 size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-foreground">Hardware & API Config</h3>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                <SchemaForm schema={schema} gridCols={2} />
            </div>
        </div>
    );
}
