'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { ChunkingConfig } from '@/lib/schemas/chunking';
import { cn } from '@/lib/utils';
import { Settings2, Type, Hash, Brain, Layers, Layout, ChevronDown } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useWatch } from 'react-hook-form';

interface StrategySettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function ChunkingStrategySelector({ form }: StrategySettingsProps) {
    const { setValue, control } = form;
    const currentStrategy = useWatch({
        control,
        name: 'chunking.strategy'
    });

    const strategies = [
        { id: 'recursive', label: 'Recursive', icon: Layers },
        { id: 'sentence', label: 'Sentence', icon: Type },
        { id: 'token', label: 'Token', icon: Hash },
        { id: 'semantic', label: 'Semantic', icon: Brain },
        { id: 'fixed', label: 'Fixed', icon: Settings2 },
        { id: 'document', label: 'Document', icon: Layout },
    ];

    const handleStrategySelect = (s: typeof strategies[0]) => {
        setValue('chunking.strategy', s.id as any);

        // Reset/Set strategy defaults
        if (s.id === 'recursive') {
            setValue('chunking.max_chunk_size', 1000);
            setValue('chunking.chunk_overlap', 200);
            setValue('chunking.separators', ["\n\n", "\n", " "]);
        } else if (s.id === 'sentence') {
            setValue('chunking.max_sentences_per_chunk', 5);
            setValue('chunking.sentence_overlap', 1);
            setValue('chunking.language', 'en');
        } else if (s.id === 'token') {
            setValue('chunking.max_tokens', 512);
            setValue('chunking.token_overlap', 50);
            setValue('chunking.tokenizer_type', 'tiktoken');
        } else if (s.id === 'semantic') {
            setValue('chunking.similarity_threshold', 0.3);
            setValue('chunking.max_chunk_tokens', 1024);
        } else if (s.id === 'fixed') {
            setValue('chunking.chunk_size', 1000);
            setValue('chunking.chunk_overlap', 200);
        } else if (s.id === 'document') {
            setValue('chunking.split_by', 'heading');
            setValue('chunking.max_section_length', 2000);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-2.5">
            {strategies.map((s) => {
                const Icon = s.icon;
                const isActive = currentStrategy === s.id;

                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => handleStrategySelect(s)}
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

export function ChunkingStrategyDetails({ form }: StrategySettingsProps) {
    const { register, setValue, control } = form;
    const strategy = useWatch({ control, name: 'chunking.strategy' });

    // Define all watched fields at the top level to avoid hook violation
    const tokenizerType = useWatch({ control, name: 'chunking.tokenizer_type' });
    const splitBy = useWatch({ control, name: 'chunking.split_by' });
    const fallbackStrategy = useWatch({ control, name: 'chunking.fallback_strategy' });

    const inputClass = "w-full h-11 bg-secondary/50 border border-border/60 rounded-xl px-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 outline-none transition-all text-foreground placeholder:text-muted-foreground/30";
    const labelClass = "text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest mb-2 block px-1";

    switch (strategy) {
        case 'recursive':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Max Chunk Size (Tokens/Chars)</label>
                            <input type="number" {...register('chunking.max_chunk_size', { valueAsNumber: true })} className={inputClass} placeholder="1000" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Min Chunk Size</label>
                            <input type="number" {...register('chunking.min_chunk_size', { valueAsNumber: true })} className={inputClass} placeholder="100" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Overlap</label>
                            <input type="number" {...register('chunking.chunk_overlap', { valueAsNumber: true })} className={inputClass} placeholder="200" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Separators (Regex/JSON)</label>
                            <input {...register('chunking.separators')} className={inputClass} placeholder='["\n\n", "\n", " "]' />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.keep_separator')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Keep Sep.</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.trim_whitespace')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Trim WS</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.fallback_to_sentence')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Fallback</span>
                        </label>
                    </div>
                </div>
            );
        case 'sentence':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Max Sentences / Chunk</label>
                            <input type="number" {...register('chunking.max_sentences_per_chunk', { valueAsNumber: true })} className={inputClass} placeholder="5" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Min Sentences / Chunk</label>
                            <input type="number" {...register('chunking.min_sentences_per_chunk', { valueAsNumber: true })} className={inputClass} placeholder="1" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Sentence Overlap</label>
                            <input type="number" {...register('chunking.sentence_overlap', { valueAsNumber: true })} className={inputClass} placeholder="1" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Natural Language</label>
                            <Select
                                onValueChange={(v) => setValue('chunking.language', v as any)}
                                value={useWatch({ control, name: 'chunking.language' })}
                            >
                                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="vi">Vietnamese</SelectItem>
                                    <SelectItem value="fr">French</SelectItem>
                                    <SelectItem value="de">German</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.respect_paragraphs')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Respect Paragraphs</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.merge_short_sentences')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Merge Short</span>
                        </label>
                    </div>
                </div>
            );
        case 'token':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Max Token Limit</label>
                            <input type="number" {...register('chunking.max_tokens', { valueAsNumber: true })} className={inputClass} placeholder="512" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Token Overlap</label>
                            <input type="number" {...register('chunking.token_overlap', { valueAsNumber: true })} className={inputClass} placeholder="50" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Tokenizer Engine</label>
                            <Select
                                onValueChange={(v) => setValue('chunking.tokenizer_type', v as any)}
                                value={tokenizerType}
                            >
                                <SelectTrigger className={inputClass}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tiktoken">TikToken (OpenAI)</SelectItem>
                                    <SelectItem value="sentencepiece">SentencePiece</SelectItem>
                                    <SelectItem value="hf">HuggingFace</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.count_special_tokens')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Special Tok.</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.truncate_overflow')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Truncate</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.strict_token_limit')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Strict Limit</span>
                        </label>
                    </div>
                </div>
            );
        case 'semantic':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Embedding Model Ref</label>
                            <input {...register('chunking.embedding_model_ref')} className={inputClass} placeholder="text-embedding-3-small" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Similarity Threshold</label>
                            <input type="number" step="0.05" {...register('chunking.similarity_threshold', { valueAsNumber: true })} className={inputClass} placeholder="0.3" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Max Tokens/Chunk</label>
                            <input type="number" {...register('chunking.max_chunk_tokens', { valueAsNumber: true })} className={inputClass} placeholder="1024" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Min Tokens/Chunk</label>
                            <input type="number" {...register('chunking.min_chunk_tokens', { valueAsNumber: true })} className={inputClass} placeholder="100" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Window Size</label>
                            <input type="number" {...register('chunking.semantic_window_size', { valueAsNumber: true })} className={inputClass} placeholder="3" />
                        </div>
                        <div className="flex items-end pb-1 px-1">
                            <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer w-full">
                                <input type="checkbox" {...register('chunking.merge_small_chunks')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                                <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Merge Small</span>
                            </label>
                        </div>
                    </div>
                </div>
            );
        case 'fixed':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Static Chunk Size</label>
                            <input type="number" {...register('chunking.chunk_size', { valueAsNumber: true })} className={inputClass} placeholder="1000" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Exact Overlap</label>
                            <input type="number" {...register('chunking.chunk_overlap', { valueAsNumber: true })} className={inputClass} placeholder="200" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.hard_cut')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Hard Character Cut</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.pad_last_chunk')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Pad Terminal</span>
                        </label>
                    </div>
                </div>
            );
        case 'document':
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Split Hierarchy By</label>
                            <Select
                                onValueChange={(v) => setValue('chunking.split_by', v as any)}
                                value={splitBy}
                            >
                                <SelectTrigger className={inputClass}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="heading">Heading Hierarchy</SelectItem>
                                    <SelectItem value="section">Logical Section</SelectItem>
                                    <SelectItem value="page">Physical Page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Max Section Length</label>
                            <input type="number" {...register('chunking.max_section_length', { valueAsNumber: true })} className={inputClass} placeholder="2000" />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Safety Fallback</label>
                            <Select
                                onValueChange={(v) => setValue('chunking.fallback_strategy', v as any)}
                                value={fallbackStrategy}
                            >
                                <SelectTrigger className={inputClass}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recursive">Recursive Splitting</SelectItem>
                                    <SelectItem value="fixed">Fixed Size Catch-all</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.preserve_hierarchy')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Preserve Nesting</span>
                        </label>
                        <label className="group flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all cursor-pointer">
                            <input type="checkbox" {...register('chunking.include_metadata')} className="w-4 h-4 rounded-md border-border bg-card text-indigo-500 focus:ring-indigo-500/20" />
                            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">Rich Metadata</span>
                        </label>
                    </div>
                </div>
            );
        default:
            return null;
    }
}
