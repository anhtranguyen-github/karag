'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';
import { Settings2, Type, Hash, Brain, Layers, Layout } from 'lucide-react';

interface StrategySettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function ChunkingStrategySelector({ form }: StrategySettingsProps) {
    const { watch, setValue } = form;
    const currentStrategy = watch('chunking.strategy');

    const strategies = [
        { id: 'recursive', label: 'Recursive', icon: Layers, desc: 'Optimized for structured text' },
        { id: 'sentence', label: 'Sentence', icon: Type, desc: 'Grammar-aware natural splits' },
        { id: 'token', label: 'Token', icon: Hash, desc: 'Strict LLM token limit splits' },
        { id: 'semantic', label: 'Semantic', icon: Brain, desc: 'Meaning-preserving clusters' },
        { id: 'fixed', label: 'Fixed', icon: Settings2, desc: 'Simple character length splits' },
        { id: 'document', label: 'Document', icon: Layout, desc: 'Layout & structural splits' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {strategies.map((s) => {
                const Icon = s.icon;
                const isActive = currentStrategy === s.id;

                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setValue('chunking', { strategy: s.id } as any)}
                        className={cn(
                            "p-3 rounded-xl border text-left transition-all group",
                            isActive
                                ? "bg-indigo-600/10 border-indigo-500 text-white shadow-lg shadow-indigo-600/5"
                                : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10 hover:bg-white/[0.07]"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                            isActive ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400 group-hover:text-gray-300"
                        )}>
                            <Icon size={16} />
                        </div>
                        <div className="font-bold text-[11px] mb-0.5">{s.label}</div>
                        <div className="text-[9px] opacity-60 leading-tight">{s.desc}</div>
                    </button>
                );
            })}
        </div>
    );
}

export function ChunkingStrategyDetails({ form }: StrategySettingsProps) {
    const { register, watch } = form;
    const strategy = watch('chunking.strategy');

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption focus:ring-1 focus:ring-indigo-500 outline-none transition-all";
    const labelClass = "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block";

    switch (strategy) {
        case 'recursive':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Max Chunk Size</label>
                            <input type="number" {...register('chunking.max_chunk_size', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Min Chunk Size</label>
                            <input type="number" {...register('chunking.min_chunk_size', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Overlap</label>
                            <input type="number" {...register('chunking.chunk_overlap', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Separators (JSON)</label>
                            <input {...register('chunking.separators')} className={inputClass} placeholder='["\n\n", "\n", " "]' />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.keep_separator')} id="keep_sep" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="keep_sep" className="text-[10px] text-gray-400 font-bold uppercase">Keep Separator</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.trim_whitespace')} id="trim_ws" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="trim_ws" className="text-[10px] text-gray-400 font-bold uppercase">Trim Whitespace</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.fallback_to_sentence')} id="fallback_sent" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="fallback_sent" className="text-[10px] text-gray-400 font-bold uppercase">Fallback to Sentence</label>
                        </div>
                    </div>
                </div>
            );
        case 'sentence':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Max Sentences</label>
                            <input type="number" {...register('chunking.max_sentences_per_chunk', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Min Sentences</label>
                            <input type="number" {...register('chunking.min_sentences_per_chunk', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Overlap</label>
                            <input type="number" {...register('chunking.sentence_overlap', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Language</label>
                            <input {...register('chunking.language')} className={inputClass} placeholder="en" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.respect_paragraphs')} id="resp_para" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="resp_para" className="text-[10px] text-gray-400 font-bold uppercase">Respect Paragraphs</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.merge_short_sentences')} id="merge_short" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="merge_short" className="text-[10px] text-gray-400 font-bold uppercase">Merge Short</label>
                        </div>
                    </div>
                </div>
            );
        case 'token':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Max Tokens</label>
                            <input type="number" {...register('chunking.max_tokens', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Overlap</label>
                            <input type="number" {...register('chunking.token_overlap', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Tokenizer</label>
                            <select {...register('chunking.tokenizer_type')} className={inputClass}>
                                <option value="tiktoken">TikToken</option>
                                <option value="sentencepiece">SentencePiece</option>
                                <option value="hf">HuggingFace</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.count_special_tokens')} id="special_toks" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="special_toks" className="text-[10px] text-gray-400 font-bold uppercase">Special Tokens</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.truncate_overflow')} id="trunc_over" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="trunc_over" className="text-[10px] text-gray-400 font-bold uppercase">Truncate Overflow</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.strict_token_limit')} id="strict_lim" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="strict_lim" className="text-[10px] text-gray-400 font-bold uppercase">Strict Limit</label>
                        </div>
                    </div>
                </div>
            );
        case 'semantic':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Embedding Ref</label>
                            <input {...register('chunking.embedding_model_ref')} className={inputClass} placeholder="text-embedding-3-small" />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Threshold</label>
                            <input type="number" step="0.05" {...register('chunking.similarity_threshold', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Max Tokens</label>
                            <input type="number" {...register('chunking.max_chunk_tokens', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Min Tokens</label>
                            <input type="number" {...register('chunking.min_chunk_tokens', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Window Size</label>
                            <input type="number" {...register('chunking.semantic_window_size', { valueAsNumber: true })} className={inputClass} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('chunking.merge_small_chunks')} id="merge_small" className="rounded bg-white/5 border-white/10" />
                        <label htmlFor="merge_small" className="text-[10px] text-gray-400 font-bold uppercase">Merge Small Chunks</label>
                    </div>
                </div>
            );
        case 'fixed':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Chunk Size</label>
                            <input type="number" {...register('chunking.chunk_size', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Overlap</label>
                            <input type="number" {...register('chunking.chunk_overlap', { valueAsNumber: true })} className={inputClass} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.hard_cut')} id="hard_cut" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="hard_cut" className="text-[10px] text-gray-400 font-bold uppercase">Hard Cut</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.pad_last_chunk')} id="pad_last" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="pad_last" className="text-[10px] text-gray-400 font-bold uppercase">Pad Last</label>
                        </div>
                    </div>
                </div>
            );
        case 'document':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>Split By</label>
                            <select {...register('chunking.split_by')} className={inputClass}>
                                <option value="heading">Heading</option>
                                <option value="section">Section</option>
                                <option value="page">Page</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Max Section Length</label>
                            <input type="number" {...register('chunking.max_section_length', { valueAsNumber: true })} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Fallback Strategy</label>
                            <select {...register('chunking.fallback_strategy')} className={inputClass}>
                                <option value="recursive">Recursive</option>
                                <option value="fixed">Fixed</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.preserve_hierarchy')} id="pres_hier" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="pres_hier" className="text-[10px] text-gray-400 font-bold uppercase">Preserve Hierarchy</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('chunking.include_metadata')} id="inc_meta" className="rounded bg-white/5 border-white/10" />
                            <label htmlFor="inc_meta" className="text-[10px] text-gray-400 font-bold uppercase">Include Metadata</label>
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
}
