'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateWorkspaceSchema, CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { api } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
    Brain,
    Info,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmbeddingProviderSelector, EmbeddingModelSelector, EmbeddingConfigDetails } from '../embedding/EmbeddingSettings';
import { ChunkingStrategySelector, ChunkingStrategyDetails } from '../chunking/StrategySettings';
import { RetrievalSettings } from '../retrieval/RetrievalSettings';
import { GenerationSettings } from '../generation/GenerationSettings';

interface WorkspaceWizardProps {
    isOpen: boolean;
    onClose: () => void;
    seedDocumentId?: string;
    seedDocumentName?: string;
}

const STEPS = [
    { title: 'Identity', icon: Layout, desc: 'Define your workspace basics' },
    { title: 'Knowledge Engine', icon: Boxes, desc: 'Choose embedding models' },
    { title: 'Ingestion Strategy', icon: Sparkles, desc: 'Control how data is chunked' },
    { title: 'Retrieval Pipeline', icon: Search, desc: 'Optimize search accuracy' },
    { title: 'Generation AI', icon: Wand2, desc: 'Final response settings' },
];

export function WorkspaceWizard({ isOpen, onClose, seedDocumentId, seedDocumentName }: WorkspaceWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateWorkspaceInput>({
        defaultValues: {
            name: seedDocumentName ? seedDocumentName.split('.')[0] + ' Research' : '',
            description: '',
            runtime: {
                mode: 'fast',
                stream_thoughts: true,
                tracing: { trace_level: 'detailed', tracing_enabled: true }
            },
            embedding: {
                provider: 'openai',
                model: 'text-embedding-3-small',
                batch_size: 100,
                timeout_ms: 10000
            },
            chunking: {
                strategy: 'recursive',
                max_chunk_size: 1000,
                chunk_overlap: 200
            },
            retrieval: {
                vector: { enabled: true, top_k: 5, similarity_metric: 'cosine' },
                bm25: { enabled: false, top_k: 5 },
                hybrid: { enabled: false },
                rerank: { enabled: false },
                graph: { enabled: false },
                advanced: { query_embedding_batch_size: 1, max_query_tokens: 512 }
            },
            generation: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_output_tokens: 2048,
                streaming: true
            }
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
        if (idx <= currentStep || form.getValues('name')) {
            setCurrentStep(idx);
        }
    };

    const onSubmit = async (values: CreateWorkspaceInput) => {
        setIsSubmitting(true);
        try {
            const res = await api.createWorkspaceWorkspacesPost({
                workspaceCreate: values as any
            });

            if (seedDocumentId && res.data?.id) {
                await api.updateDocumentWorkspacesDocumentsUpdateWorkspacesPost({
                    documentWorkspaceUpdate: {
                        document_id: seedDocumentId,
                        target_workspace_id: res.data.id,
                        action: 'link',
                        force_reindex: true
                    } as any
                });
            }

            onClose();
            router.refresh();
            if (res.data?.id) {
                router.push(`/workspaces/${res.data.id}`);
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
                                    <FormLabel>Workspace Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Engineering Knowledge Base" {...field} />
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
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="A central hub for technical documentation..."
                                            className="min-h-[140px] resize-none"
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
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-4 items-start">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Info size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-indigo-200">System Knowledge Root</h4>
                                <p className="text-xs text-indigo-200/60 leading-relaxed">
                                    Choose the embedding model that will index your documents.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Select Provider</label>
                                <EmbeddingProviderSelector form={form} />
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Model Configuration</label>
                                    <EmbeddingModelSelector form={form} />
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <EmbeddingConfigDetails form={form} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                                <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Strategy</label>
                                <ChunkingStrategySelector form={form} />
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Detailed Parameters</label>
                                <ChunkingStrategyDetails form={form} />
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
            title="AI Strategy Wizard"
            className="max-w-5xl bg-background border-border shadow-2xl overflow-hidden"
            containerClassName="p-0"
        >
            <div className="flex h-full min-h-[600px] pointer-events-auto">
                {/* Sidebar Navigation */}
                <div className="w-[280px] bg-card border-r border-border flex flex-col p-6 pointer-events-auto">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight text-foreground">Setup Wizard</h3>
                            <p className="text-[10px] text-muted-foreground font-medium">New AI Workspace</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = currentStep === idx;
                            const isPast = currentStep > idx;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => jumpToStep(idx)}
                                    className={cn(
                                        "flex flex-col gap-1 p-3 rounded-xl transition-all relative group text-left w-full",
                                        isActive ? "bg-secondary text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center border transition-all",
                                            isActive
                                                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-500"
                                                : isPast
                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                                                    : "bg-secondary border-border text-muted-foreground"
                                        )}>
                                            {isPast ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                                        </div>
                                        <div className="font-bold text-[11px] uppercase tracking-wider">{step.title}</div>
                                    </div>
                                    <div className="text-[9px] pl-10 opacity-60 font-medium leading-tight text-muted-foreground">
                                        {step.desc}
                                    </div>

                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-auto p-4 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-transparent border border-indigo-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={12} className="text-indigo-500" />
                            <span className="text-[10px] font-bold text-indigo-500">Strategy Engine</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                            Our wizard automatically optimizes common retrieval patterns.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-background pointer-events-auto">
                    <Form {...form}>
                        <form id="wizard-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full pointer-events-auto">
                            <div className="flex-1 p-10 overflow-y-auto max-h-[70vh] custom-scrollbar pointer-events-auto">
                                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-2">
                                        Step {currentStep + 1} of {STEPS.length}
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
                                        {STEPS[currentStep].title}
                                    </h2>
                                    <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                                        {STEPS[currentStep].desc}. Configure the parameters below to tune the pipeline.
                                    </p>
                                </div>

                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 pointer-events-auto">
                                    {renderStepContent()}
                                </div>
                            </div>

                            {/* Footer Controls */}
                            <div className="p-6 bg-card border-t border-border flex items-center justify-between pointer-events-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 0 || isSubmitting}
                                    className="h-10 px-6 rounded-xl border border-transparent hover:bg-secondary text-muted-foreground font-bold"
                                >
                                    <ChevronLeft size={16} className="mr-2" />
                                    Previous
                                </Button>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="h-10 rounded-xl border-border bg-secondary hover:bg-muted text-foreground font-bold"
                                    >
                                        Exit
                                    </Button>
                                    {currentStep < STEPS.length - 1 ? (
                                        <Button
                                            type="button"
                                            onClick={nextStep}
                                            className="h-10 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 group"
                                        >
                                            Next Step
                                            <ChevronRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-10 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold shadow-xl shadow-indigo-600/30"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Initializing...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} className="mr-2" />
                                                    Launch Workspace
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
