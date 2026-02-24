'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { api } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Layout,
    Sparkles,
    Boxes,
    Search,
    Wand2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmbeddingProviderSelector, EmbeddingModelSelector, EmbeddingConfigDetails } from '../embedding/EmbeddingSettings';
import { ChunkingStrategySelector, ChunkingStrategyDetails } from '../chunking/StrategySettings';
import { RetrievalSettings } from '../retrieval/RetrievalSettings';
import { GenerationSettings } from '../generation/GenerationSettings';

interface WorkspaceWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = [
    { title: 'General', icon: Layout, desc: 'Naming & description' },
    { title: 'Chunking', icon: Sparkles, desc: 'Document splitting' },
    { title: 'Embedding', icon: Boxes, desc: 'Vectorization strategy' },
    { title: 'Search', icon: Search, desc: 'Retrieval & ranking' },
    { title: 'AI Model', icon: Wand2, desc: 'Response settings' },
];

export function WorkspaceWizard({ isOpen, onClose }: WorkspaceWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateWorkspaceInput>({
        defaultValues: {
            name: '',
            description: '',
            chunking: {
                strategy: 'recursive',
                max_chunk_size: 800,
                chunk_overlap: 150,
            },
            embedding: {
                dense: {
                    provider: 'openai',
                    model: 'text-embedding-3-small',
                    batch_size: 32,
                    timeout_ms: 30000
                },
                sparse: {
                    method: 'bm25',
                    language: 'en',
                    on_the_fly: true
                }
            },
            retrieval: {
                vector: { enabled: true, top_k: 5 },
                sparse: { enabled: false, top_k: 5 },
                hybrid: { enabled: false, dense_weight: 0.5 },
                rerank: { enabled: false, provider: 'local', top_n: 3 },
                graph: { enabled: false },
                advanced: { query_embedding_batch_size: 1 }
            },
            generation: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_output_tokens: 2048,
                streaming: true
            },
            runtime: {
                mode: 'auto',
                stream_thoughts: true,
                tracing: { trace_level: 'detailed' }
            },
            system_prompt: 'You are an advanced reasoning assistant. Use the provided context to answer the user\'s question.'
        },
    });

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const jumpToStep = (idx: number) => {
        setCurrentStep(idx);
    };

    const onSubmit = async (data: CreateWorkspaceInput) => {
        setIsSubmitting(true);
        try {
            const payload: any = {
                ...data,
                embedding_provider: data.embedding.dense.provider,
                embedding_model: data.embedding.dense.model,
                llm_provider: data.generation.provider,
                llm_model: data.generation.model,
                temperature: data.generation.temperature,
                rag_engine: data.retrieval.graph.enabled ? 'graph' : 'basic',
                search_limit: data.retrieval.vector.top_k,
                recall_k: data.retrieval.vector.top_k,
                hybrid_alpha: data.retrieval.hybrid.dense_weight,
                reranker_enabled: data.retrieval.rerank.enabled,
                reranker_provider: data.retrieval.rerank.provider,
                rerank_top_k: data.retrieval.rerank.top_n,
                chunking_strategy: data.chunking.strategy,
            };

            const result = await api.createWorkspaceWorkspacesPost({ workspaceCreate: payload });

            if (result.success) {
                onClose();
                router.refresh();
                if (result.data?.id) {
                    router.push(`/workspaces/${result.data.id}`);
                }
            }
        } catch (error) {
            console.error('Failed to create workspace:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Workspace Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Engineering Knowledge Base" className="h-12 bg-secondary/50 border-border rounded-xl px-4" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="A central hub for technical documentation..."
                                            className="min-h-[160px] resize-none bg-secondary/50 border-border rounded-xl p-4"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Choose Strategy</label>
                                <ChunkingStrategySelector />
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Refinement Settings</label>
                                <ChunkingStrategyDetails />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Dense Provider</label>
                                <EmbeddingProviderSelector />
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Model Setup</label>
                                    <EmbeddingModelSelector />
                                </div>
                                <div className="pt-4">
                                    <EmbeddingConfigDetails />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <RetrievalSettings form={form} />
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <GenerationSettings form={form} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Boxes size={16} className="text-indigo-500" />
                    </div>
                    <span className="font-bold tracking-tight">Intelligence Configurator</span>
                </div>
            )}
            className="max-w-6xl bg-background border-border shadow-2xl overflow-hidden rounded-[2rem]"
            containerClassName="p-0"
        >
            <div className="flex flex-col h-[85vh]">
                {/* Header Step Progress */}
                <div className="flex items-center justify-between px-12 py-8 bg-card/30 border-b border-border/50">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;

                        return (
                            <React.Fragment key={idx}>
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <button
                                        type="button"
                                        onClick={() => jumpToStep(idx)}
                                        className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10",
                                            isActive
                                                ? "bg-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] scale-110"
                                                : isCompleted
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    : "bg-secondary text-muted-foreground border border-border group-hover:border-indigo-500/30"
                                        )}
                                    >
                                        {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={20} />}
                                    </button>
                                    <div className="absolute -bottom-10 flex flex-col items-center min-w-[100px]">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
                                            isActive ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {step.title}
                                        </span>
                                    </div>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-4 bg-border/40 relative overflow-hidden rounded-full">
                                        <div
                                            className={cn(
                                                "h-full bg-indigo-500 transition-all duration-1000 ease-out",
                                                isCompleted ? "w-full" : "w-0"
                                            )}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col mt-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto px-12 py-8 custom-scrollbar">
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {renderStepContent()}
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="px-12 py-8 bg-card/50 border-t border-border/50 flex items-center justify-between backdrop-blur-xl">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 0 || isSubmitting}
                                    className="h-12 px-6 rounded-2xl text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:bg-secondary"
                                >
                                    <ChevronLeft size={16} className="mr-2" />
                                    Back
                                </Button>

                                <div className="flex items-center gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="h-12 rounded-2xl border-border bg-transparent hover:bg-secondary px-8 font-black uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </Button>
                                    {currentStep < STEPS.length - 1 ? (
                                        <Button
                                            type="button"
                                            onClick={nextStep}
                                            className="h-12 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] text-[10px] shadow-2xl shadow-indigo-600/30 group"
                                        >
                                            Continue
                                            <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-12 px-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/40"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Provisioning...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} className="mr-2" />
                                                    Initialize Hub
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </Modal>
    );
}
