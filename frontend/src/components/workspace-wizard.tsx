'use client';

import React, { useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronRight, ChevronLeft, Zap, Database, Search,
    Share2, Cpu, Settings2, ShieldCheck, CheckCircle2,
    Info, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateWorkspaceSchema, CreateWorkspaceInput } from '@/lib/schemas/workspaces';

interface WorkspaceWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateWorkspaceInput) => Promise<void>;
    isCreating: boolean;
}

type Step = 'identity' | 'reasoning' | 'retrieval' | 'storage';

export function WorkspaceWizard({ isOpen, onClose, onSubmit, isCreating }: WorkspaceWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>('identity');
    const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

    const form = useForm<CreateWorkspaceInput>({
        resolver: zodResolver(CreateWorkspaceSchema) as any,
        defaultValues: {
            name: '',
            description: '',
            llm_provider: 'openai',
            llm_model: 'gpt-4o',
            temperature: 0.7,
            agentic_enabled: true,
            embedding_provider: 'openai',
            embedding_model: 'text-embedding-3-small',
            embedding_dim: 1536,
            chunk_size: 800,
            chunk_overlap: 150,
            rag_engine: 'basic',
            search_limit: 5,
            hybrid_alpha: 0.5,
            graph_enabled: true,
            reranker_enabled: false,
            reranker_provider: 'none',
        }
    });

    const { register, watch, setValue, handleSubmit, formState: { errors } } = form;

    const steps: { id: Step; label: string; icon: any }[] = [
        { id: 'identity', label: 'Identity', icon: Database },
        { id: 'reasoning', label: 'Reasoning', icon: Zap },
        { id: 'retrieval', label: 'Retrieval', icon: Search },
        { id: 'storage', label: 'Storage', icon: Database },
    ];

    const handleNext = () => {
        if (currentStep === 'identity') setCurrentStep('reasoning');
        else if (currentStep === 'reasoning') setCurrentStep('retrieval');
        else if (currentStep === 'retrieval') setCurrentStep('storage');
    };

    const handleBack = () => {
        if (currentStep === 'reasoning') setCurrentStep('identity');
        else if (currentStep === 'retrieval') setCurrentStep('reasoning');
        else if (currentStep === 'storage') setCurrentStep('retrieval');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#0f0f12] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px]"
            >
                {/* Sidebar */}
                <div className="w-full md:w-56 bg-white/5 border-r border-white/10 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Zap className="text-white" size={16} />
                            </div>
                            <span className="text-body font-bold text-white">KARAG</span>
                        </div>

                        <nav className="space-y-4">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isDone = steps.findIndex(s => s.id === currentStep) > idx;

                                return (
                                    <div
                                        key={step.id}
                                        className={cn(
                                            "flex items-center gap-3 transition-all",
                                            isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-gray-500"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                                            isActive ? "border-blue-400 bg-blue-400/10" :
                                                isDone ? "border-green-400 bg-green-400/10" : "border-white/10"
                                        )}>
                                            {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                                        </div>
                                        <span className="text-tiny font-medium">{step.label}</span>
                                    </div>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="mt-8 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                            <ShieldCheck size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">System Node</span>
                        </div>
                        <p className="text-[10px] text-gray-500 italic">Evaluation & Observability are managed by the system.</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                        <div>
                            <h2 className="text-h3 font-bold text-white capitalize">{currentStep} Configuration</h2>
                            <p className="text-tiny text-gray-500">Configure functional nodes for this workspace</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setMode('simple')}
                                className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", mode === 'simple' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                            >
                                Simple
                            </button>
                            <button
                                onClick={() => setMode('advanced')}
                                className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", mode === 'advanced' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                            >
                                Advanced
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {currentStep === 'identity' && (
                                    <motion.div
                                        key="identity"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <NodeCard
                                            icon={Settings2}
                                            title="Workspace Metadata"
                                            description="Define the core identity of this RAG pipeline"
                                            status="mandatory"
                                        >
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Workspace Name</label>
                                                    <input
                                                        {...register('name')}
                                                        placeholder="e.g., Enterprise Brain"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-caption focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                    />
                                                    {errors.name && <p className="text-red-400 text-[10px]">{errors.name.message}</p>}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Description</label>
                                                    <textarea
                                                        {...register('description')}
                                                        placeholder="What is the purpose of this workspace?"
                                                        rows={3}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-caption focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </NodeCard>
                                    </motion.div>
                                )}

                                {currentStep === 'reasoning' && (
                                    <motion.div
                                        key="reasoning"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <NodeCard
                                            icon={Zap}
                                            title="Generation Node"
                                            description="LLM configuration for final response synthesis"
                                            status="mandatory"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Provider</label>
                                                    <select
                                                        {...register('llm_provider')}
                                                        className="w-full bg-[#1a1a1f] border border-white/10 rounded-xl px-3 py-2 text-caption focus:ring-1 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="openai">OpenAI</option>
                                                        <option value="anthropic">Anthropic</option>
                                                        <option value="ollama">Ollama</option>
                                                        <option value="vllm">vLLM</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Model</label>
                                                    <input
                                                        {...register('llm_model')}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                                {mode === 'advanced' && (
                                                    <div className="space-y-1.5 col-span-2">
                                                        <label className="text-tiny font-bold text-gray-400">Temperature: {watch('temperature')}</label>
                                                        <input
                                                            type="range"
                                                            min="0" max="2" step="0.1"
                                                            {...register('temperature', { valueAsNumber: true })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </NodeCard>

                                        <NodeCard
                                            icon={Cpu}
                                            title="Agentic Node"
                                            description="Enable multi-pass reasoning and tool usage"
                                            status="optional"
                                            enabled={watch('agentic_enabled')}
                                            onToggle={(e) => setValue('agentic_enabled', e)}
                                        >
                                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-blue-200/60 leading-relaxed">
                                                    When enabled, the system uses a ReAct pattern to plan and execute multiple steps before generating a final answer.
                                                </p>
                                            </div>
                                        </NodeCard>
                                    </motion.div>
                                )}

                                {currentStep === 'retrieval' && (
                                    <motion.div
                                        key="retrieval"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <NodeCard
                                            icon={Search}
                                            title="Retrieval Node"
                                            description="Search strategy for fetching relevant context"
                                            status="mandatory"
                                        >
                                            <div className="flex gap-2">
                                                {['basic', 'graph'].map((engine) => (
                                                    <button
                                                        key={engine}
                                                        type="button"
                                                        onClick={() => setValue('rag_engine', engine as any)}
                                                        className={cn(
                                                            "flex-1 p-3 rounded-xl border transition-all text-left",
                                                            watch('rag_engine') === engine
                                                                ? "bg-blue-600/10 border-blue-500 text-white"
                                                                : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10"
                                                        )}
                                                    >
                                                        <div className="text-caption font-bold capitalize mb-0.5">{engine}</div>
                                                        <div className="text-[10px] opacity-60">
                                                            {engine === 'basic' ? 'Vector + Keyword' : 'Graph Expansion + Vector'}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </NodeCard>

                                        <div className="grid grid-cols-2 gap-4">
                                            <NodeCard
                                                icon={Share2}
                                                title="Knowledge Node"
                                                description="Graph-based relationships"
                                                status="optional"
                                                enabled={watch('graph_enabled')}
                                                onToggle={(e) => setValue('graph_enabled', e)}
                                            />
                                            <NodeCard
                                                icon={ShieldCheck}
                                                title="Reranking Node"
                                                description="Post-retrieval refinement"
                                                status="optional"
                                                enabled={watch('reranker_enabled')}
                                                onToggle={(e) => setValue('reranker_enabled', e)}
                                            />
                                        </div>

                                        {mode === 'advanced' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Search Limit (Top-K)</label>
                                                    <input
                                                        type="number"
                                                        {...register('search_limit', { valueAsNumber: true })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Hybrid Alpha</label>
                                                    <input
                                                        type="number" step="0.1"
                                                        {...register('hybrid_alpha', { valueAsNumber: true })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {currentStep === 'storage' && (
                                    <motion.div
                                        key="storage"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <NodeCard
                                            icon={Database}
                                            title="Embedding Node"
                                            description="Vector representation settings (Immutable)"
                                            status="mandatory"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Provider</label>
                                                    <select
                                                        {...register('embedding_provider')}
                                                        className="w-full bg-[#1a1a1f] border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    >
                                                        <option value="openai">OpenAI</option>
                                                        <option value="voyage">Voyage</option>
                                                        <option value="local">Local (HuggingFace)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Dimension</label>
                                                    <input
                                                        type="number"
                                                        {...register('embedding_dim', { valueAsNumber: true })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center gap-2">
                                                <AlertTriangle size={12} className="text-orange-400" />
                                                <span className="text-[10px] text-orange-200/60">Choose carefully. Changing these later requires re-indexing.</span>
                                            </div>
                                        </NodeCard>

                                        <NodeCard
                                            icon={Database}
                                            title="Ingestion Node"
                                            description="Data processing & chunking settings"
                                            status="mandatory"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Chunk Size</label>
                                                    <input
                                                        type="number"
                                                        {...register('chunk_size', { valueAsNumber: true })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-tiny font-bold text-gray-400">Overlap</label>
                                                    <input
                                                        type="number"
                                                        {...register('chunk_overlap', { valueAsNumber: true })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-caption outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </NodeCard>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/20">
                        <button
                            type="button"
                            onClick={currentStep === 'identity' ? onClose : handleBack}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-caption font-bold text-gray-400 transition-all border border-white/5"
                        >
                            <ChevronLeft size={16} />
                            {currentStep === 'identity' ? 'Exit' : 'Back'}
                        </button>

                        <div className="flex gap-3">
                            {currentStep === 'storage' ? (
                                <button
                                    onClick={handleSubmit(onSubmit)}
                                    disabled={isCreating}
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-caption font-bold text-white transition-all shadow-lg shadow-blue-600/20"
                                >
                                    {isCreating ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Cpu size={16} /></motion.div>
                                    ) : (
                                        <CheckCircle2 size={16} />
                                    )}
                                    {isCreating ? 'Provisioning...' : 'Deploy Workspace'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-caption font-bold text-white transition-all"
                                >
                                    Next Step
                                    <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

interface NodeCardProps {
    icon: any;
    title: string;
    description: string;
    status: 'mandatory' | 'optional';
    enabled?: boolean;
    onToggle?: (val: boolean) => void;
    children?: React.ReactNode;
}

function NodeCard({ icon: Icon, title, description, status, enabled = true, onToggle, children }: NodeCardProps) {
    return (
        <div className={cn(
            "p-4 rounded-2xl border transition-all",
            enabled ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-50"
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                        enabled ? "bg-blue-600/10 text-blue-400" : "bg-white/5 text-gray-600"
                    )}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-caption font-bold text-white">{title}</h4>
                            <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded uppercase font-black",
                                status === 'mandatory' ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-gray-500"
                            )}>
                                {status}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500">{description}</p>
                    </div>
                </div>
                {status === 'optional' && onToggle && (
                    <button
                        type="button"
                        onClick={() => onToggle(!enabled)}
                        className={cn(
                            "w-10 h-5 rounded-full relative transition-all",
                            enabled ? "bg-blue-600" : "bg-white/10"
                        )}
                    >
                        <motion.div
                            animate={{ x: enabled ? 20 : 2 }}
                            className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                        />
                    </button>
                )}
            </div>
            {children && (
                <div className={cn("transition-all", !enabled && "pointer-events-none")}>
                    {children}
                </div>
            )}
        </div>
    );
}
