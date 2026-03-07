'use client';

import React from 'react';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';
import { Settings2, Type, Hash, Brain, Layers, Layout } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

export function ChunkingStrategySelector() {
    'use no memo';
    const { setValue, watch } = useFormContext<CreateWorkspaceInput>();
    const [localStrategy, setLocalStrategy] = React.useState(watch('chunking.strategy'));

    const strategies: { id: CreateWorkspaceInput['chunking']['strategy']; label: string; icon: typeof Layout }[] = [
        { id: 'recursive', label: 'Recursive', icon: Layers },
        { id: 'sentence', label: 'Sentence', icon: Type },
        { id: 'token', label: 'Token', icon: Hash },
        { id: 'semantic', label: 'Semantic', icon: Brain },
        { id: 'fixed', label: 'Fixed', icon: Settings2 },
        { id: 'document', label: 'Document', icon: Layout },
    ];

    const handleStrategyChange = (strategyId: CreateWorkspaceInput['chunking']['strategy']) => {
        setLocalStrategy(strategyId);
        setValue('chunking.strategy', strategyId);

        // Set strategy-specific defaults
        if (strategyId === 'recursive') {
            setValue('chunking.max_chunk_size', 1000);
            setValue('chunking.chunk_overlap', 200);
            setValue('chunking.separators', ["\n\n", "\n", " "]);
        } else if (strategyId === 'sentence') {
            setValue('chunking.max_sentences_per_chunk', 5);
            setValue('chunking.sentence_overlap', 1);
            setValue('chunking.language', 'en');
        } else if (strategyId === 'token') {
            setValue('chunking.max_tokens', 512);
            setValue('chunking.token_overlap', 50);
            setValue('chunking.tokenizer_type', 'tiktoken');
        } else if (strategyId === 'semantic') {
            setValue('chunking.similarity_threshold', 0.3);
            setValue('chunking.max_chunk_tokens', 1024);
        } else if (strategyId === 'fixed') {
            setValue('chunking.chunk_size', 1000);
            setValue('chunking.chunk_overlap', 200);
        } else if (strategyId === 'document') {
            setValue('chunking.split_by', 'heading');
            setValue('chunking.max_section_length', 2000);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-2.5">
            {strategies.map((s) => {
                const Icon = s.icon;
                const isActive = localStrategy === s.id;

                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => handleStrategyChange(s.id)}
                        className={cn(
                            "group relative flex items-center gap-4 p-3.5 rounded-2xl border text-left transition-all duration-200",
                            isActive
                                ? "bg-indigo-500/10 border-indigo-500/50 text-foreground ring-1 ring-indigo-500/20 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.15)]"
                                : "bg-card/40 border-border/60 text-muted-foreground hover:bg-secondary/80 hover:border-indigo-500/30"
                        )}
                    >
                        <div className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                            isActive
                                ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/25"
                                : "bg-secondary/80 border border-border/50 text-muted-foreground group-hover:bg-indigo-500/20 group-hover:text-indigo-500"
                        )}>
                            <Icon size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className={cn(
                                "font-bold text-xs mb-0.5 tracking-tight transition-colors",
                                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                                {s.label}
                            </div>
                        </div>

                        {isActive && (
                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

import { SchemaForm } from '@/components/ui/schema-form';
import { CHUNKING_SCHEMAS } from '@/lib/schemas/ui-schemas';

export function ChunkingStrategyDetails() {
    'use no memo';
    const { watch } = useFormContext<CreateWorkspaceInput>();
    const strategy = watch('chunking.strategy');

    const schema = CHUNKING_SCHEMAS[strategy];

    if (!schema) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <SchemaForm schema={schema} gridCols={2} />
        </div>
    );
}
