'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WorkspaceCreateSchema, CreateWorkspaceInput } from '@/lib/schemas/workspaces';
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
import { ExecutionSettings } from '../execution/ExecutionSettings';

interface WorkspaceWizardProps {
    isOpen: boolean;
    onClose: () => void;
    seedDocumentId?: string;
    seedDocumentName?: string;
}

const STEPS = [
    { title: 'Identity & Mode', icon: Layout, desc: 'Define your workspace basics' },
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
        // resolver: zodResolver(WorkspaceCreateSchema), // We'll validate manually per step for better UX
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
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
                                                    className="min-h-[100px] resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">
                                    <Brain size={14} />
                                    Default Thinking Mode
                                </div>
                                <ExecutionSettings form={form} />
                            </div>
                        </div>
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
                                    This cannot be changed later without re-indexing all documents.
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
                                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                    <h5 className="text-[11px] font-bold text-white/40 uppercase">Strategy Tip</h5>
                                    <p className="text-[10px] text-white/30 leading-relaxed italic">
                                        "Recursive" is best for general text. Use "Semantic" for long-form nuanced content if you have a fast embedding model.
                                    </p>
                                </div>
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
            className="max-w-5xl bg-[#0a0a0b] border-white/5 shadow-2xl p-0 overflow-hidden"
        >
            <div className="flex h-full min-h-[600px]">
                {/* Sidebar Navigation */}
                <div className="w-[280px] bg-black/40 border-r border-white/5 flex flex-col p-6">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Setup Wizard</h3>
                            <p className="text-[10px] text-white/40 font-medium">New AI Workspace</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = currentStep === idx;
                            const isPast = currentStep > idx;

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex flex-col gap-1 p-3 rounded-xl transition-all relative group cursor-default",
                                        isActive ? "bg-white/5 text-white shadow-sm ring-1 ring-white/10" : "text-gray-500"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center border transition-all",
                                            isActive
                                                ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                                                : isPast
                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                                    : "bg-white/5 border-white/5 text-gray-600"
                                        )}>
                                            {isPast ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                                        </div>
                                        <div className="font-bold text-[11px] uppercase tracking-wider">{step.title}</div>
                                    </div>
                                    <div className="text-[9px] pl-10 opacity-60 font-medium leading-tight">
                                        {step.desc}
                                    </div>

                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="mt-auto p-4 rounded-2xl bg-gradient-to-b from-blue-500/5 to-transparent border border-blue-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={12} className="text-blue-400" />
                            <span className="text-[10px] font-bold text-blue-200">Strategy Engine</span>
                        </div>
                        <p className="text-[10px] text-blue-200/40 leading-relaxed font-medium">
                            Our wizard automatically optimizes common retrieval patterns.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-black/20">
                    <Form {...form}>
                        <form id="wizard-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                            <div className="flex-1 p-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-2">
                                        Step {currentStep + 1} of {STEPS.length}
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                                        {STEPS[currentStep].title}
                                    </h2>
                                    <p className="text-sm text-white/40 max-w-xl leading-relaxed">
                                        {STEPS[currentStep].desc}. Configure the parameters below to tune the pipeline to your specific document types.
                                    </p>
                                </div>

                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    {renderStepContent()}
                                </div>
                            </div>

                            {/* Footer Controls */}
                            <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 0 || isSubmitting}
                                    className="h-10 px-6 rounded-xl border border-transparent hover:bg-white/5 text-gray-400 font-bold"
                                >
                                    <ChevronLeft size={16} className="mr-2" />
                                    Previous
                                </Button>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="h-10 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold"
                                    >
                                        Exit
                                    </Button>
                                    {currentStep < STEPS.length - 1 ? (
                                        <Button
                                            type="button"
                                            onClick={nextStep}
                                            className="h-10 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 group"
                                        >
                                            Next Step
                                            <ChevronRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-10 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-blue-600/30"
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
