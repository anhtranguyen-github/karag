"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Settings2, Database, Brain, Network,
    Sparkles, Shield, Cpu, ChevronRight, CheckCircle2,
    Info, Loader2, Search, Trash2, FileText, MessageSquare
} from 'lucide-react';
import { CreateWorkspaceInput, CreateWorkspaceSchema } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<any>;
    isCreating: boolean;
}

const LLM_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'] },
    { id: 'groq', name: 'Groq', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
    { id: 'ollama', name: 'Ollama', models: ['llama3.2', 'mistral', 'qwen2.5-coder'] },
    { id: 'google', name: 'Google', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] }
];

const EMBEDDING_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: [{ name: 'text-embedding-3-small', dim: 1536 }, { name: 'text-embedding-3-large', dim: 3072 }] },
    { id: 'ollama', name: 'Ollama', models: [{ name: 'nomic-embed-text', dim: 768 }, { name: 'mxbai-embed-large', dim: 1024 }] },
    { id: 'google', name: 'Google', models: [{ name: 'embedding-004', dim: 768 }] }
];

const RERANKER_PROVIDERS = [
    { id: 'none', name: 'None (Disabled)' },
    { id: 'cohere', name: 'Cohere (Recommended)' },
    { id: 'jina', name: 'Jina AI' }
];

const FormSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                <Icon size={16} />
            </div>
            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <div className="pl-11 pr-4 space-y-8">
            {children}
        </div>
    </div>
);

export const CreateWorkspaceModal = ({ isOpen, onClose, onSubmit, isCreating }: CreateWorkspaceModalProps) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    const form = useForm<CreateWorkspaceInput>({
        mode: 'onBlur',
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
            recall_k: 20,
            hybrid_alpha: 0.5,
            graph_enabled: true,
            reranker_enabled: false,
            reranker_provider: 'none',
            rerank_top_k: 3
        }
    });

    const { register, watch, setValue, handleSubmit, getValues, formState: { errors, isValid } } = form;

    const selectedLLMProvider = watch('llm_provider');
    const selectedEMBProvider = watch('embedding_provider');
    const selectedRerankProvider = watch('reranker_provider');
    const workspaceName = watch('name');

    // Sync models when provider changes
    useEffect(() => {
        const prov = LLM_PROVIDERS.find(p => p.id === selectedLLMProvider);
        if (prov && prov.models.length > 0) {
            setValue('llm_model', prov.models[0], { shouldValidate: true });
        }
    }, [selectedLLMProvider, setValue]);

    useEffect(() => {
        const prov = EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider);
        if (prov && prov.models.length > 0) {
            setValue('embedding_model', prov.models[0].name, { shouldValidate: true });
            setValue('embedding_dim', prov.models[0].dim, { shouldValidate: true });
        }
    }, [selectedEMBProvider, setValue]);

    useEffect(() => {
        if (selectedRerankProvider === 'none') {
            setValue('reranker_enabled', false, { shouldValidate: true });
        } else {
            setValue('reranker_enabled', true, { shouldValidate: true });
        }
    }, [selectedRerankProvider, setValue]);

    // Handle graph engine sync
    const selectedRagEngine = watch('rag_engine');
    useEffect(() => {
        if (selectedRagEngine === 'graph') {
            setValue('graph_enabled', true, { shouldValidate: true });
        }
    }, [selectedRagEngine, setValue]);

    if (!isOpen) return null;

    const handleFormSubmit = async (data: CreateWorkspaceInput) => {
        if (!isConfirmed) {
            setIsConfirmed(true);
            return;
        }
        await onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl h-[90vh] bg-[#0A0A0B] rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0D0D0E]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Create Workspace</h2>
                            <p className="text-tiny text-gray-500">Configure your new knowledge ecosystem</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <form className="max-w-3xl mx-auto space-y-16">
                        {/* Section 1: Basic Info */}
                        <FormSection title="1. Identity & Purpose" icon={Brain}>
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-2">
                                    <label htmlFor="ws-name" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Workspace Name</label>
                                    <input
                                        {...register('name')}
                                        id="ws-name"
                                        type="text"
                                        placeholder="e.g. Legal Research Core"
                                        className={cn(
                                            "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-all",
                                            errors.name ? "border-red-500/50 bg-red-500/5" : "border-white/5 focus:border-blue-500/30 focus:bg-white/[0.07]"
                                        )}
                                    />
                                    {errors.name && <p className="text-red-400 text-tiny font-bold ml-1">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="ws-desc" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                                    <textarea
                                        {...register('description')}
                                        id="ws-desc"
                                        rows={3}
                                        placeholder="What knowledge will this workspace focus on?"
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.07] transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* Section 2: AI Brain */}
                        <FormSection title="2. Cognitive Engines" icon={Cpu}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* LLM Provider */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="llm-provider" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Master LLM</label>
                                        <select
                                            {...register('llm_provider')}
                                            id="llm-provider"
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30"
                                        >
                                            {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id} className="bg-[#0A0A0B]">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="llm-model" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intelligence Model</label>
                                        <select
                                            {...register('llm_model')}
                                            id="llm-model"
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30"
                                        >
                                            {LLM_PROVIDERS.find(p => p.id === selectedLLMProvider)?.models.map(m => (
                                                <option key={m} value={m} className="bg-[#0A0A0B]">{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Embedding Provider */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="emb-provider" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Embedding Engine</label>
                                        <select
                                            {...register('embedding_provider')}
                                            id="emb-provider"
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30"
                                        >
                                            {EMBEDDING_PROVIDERS.map(p => <option key={p.id} value={p.id} className="bg-[#0A0A0B]">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="emb-model" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vector Transformation</label>
                                        <select
                                            {...register('embedding_model', {
                                                onChange: (e) => {
                                                    const modelName = e.target.value;
                                                    const prov = EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider);
                                                    const model = prov?.models.find(m => m.name === modelName);
                                                    if (model) {
                                                        setValue('embedding_dim', model.dim, { shouldValidate: true });
                                                    }
                                                }
                                            })}
                                            id="emb-model"
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30"
                                        >
                                            {EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider)?.models.map(m => (
                                                <option key={m.name} value={m.name} className="bg-[#0A0A0B]">{m.name} ({m.dim}d)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* Section 3: RAG Strategy */}
                        <FormSection title="3. Knowledge Retrieval" icon={Database}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="rag-engine" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Search Mode</label>
                                        <select
                                            {...register('rag_engine')}
                                            id="rag-engine"
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30"
                                        >
                                            <option value="basic" className="bg-[#0A0A0B]">Hybrid Vector (Fast)</option>
                                            <option value="graph" className="bg-[#0A0A0B]">Knowledge Graph (Deep)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-8 pt-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-tiny font-bold text-white">Advanced Graph Analysis</p>
                                                <p className="text-[9px] text-gray-500">Extract entity relationships</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                {...register('graph_enabled')}
                                                className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-blue-600 focus:ring-0"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-tiny font-bold text-white">Agentic Reasoning</p>
                                                <p className="text-[9px] text-gray-500">Multi-step deep search</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                {...register('agentic_enabled')}
                                                className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-blue-600 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings2 size={12} className="text-blue-400" />
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Tuning</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-gray-500">CHUNK SIZE</p>
                                            <input
                                                type="number"
                                                {...register('chunk_size', { valueAsNumber: true })}
                                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-tiny text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-gray-500">OVERLAP</p>
                                            <input
                                                type="number"
                                                {...register('chunk_overlap', { valueAsNumber: true })}
                                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-tiny text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </form>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/5 bg-[#0D0D0E] flex items-center justify-between">
                    <div className="flex items-center gap-4 text-tiny text-gray-500">
                        {workspaceName && workspaceName.length > 0 ? (
                            <div className="flex items-center gap-2 text-emerald-400 font-bold" data-testid="identity-confirmed">
                                <CheckCircle2 size={14} />
                                <span>Identity Confirmed</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-orange-400 font-bold" data-testid="identity-pending">
                                <Info size={14} />
                                <span>Complete Identity to Deploy</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-tiny font-bold text-gray-400 hover:text-white transition-all"
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={(e) => {
                                if (!isConfirmed) {
                                    const name = getValues('name');
                                    if (name && name.length > 0) {
                                        setIsConfirmed(true);
                                    }
                                } else {
                                    handleSubmit(handleFormSubmit)(e);
                                }
                            }}
                            disabled={isCreating || (!workspaceName || workspaceName.length === 0)}
                            className={cn(
                                "relative px-8 py-2.5 rounded-xl text-tiny font-black tracking-widest transition-all",
                                isCreating
                                    ? "bg-blue-600/50 text-white animate-pulse"
                                    : (!workspaceName || workspaceName.length === 0)
                                        ? "bg-white/5 text-gray-600 cursor-not-allowed"
                                        : isConfirmed
                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            )}
                        >
                            {isCreating ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>DEPLOYING...</span>
                                </div>
                            ) : (
                                <span>{isConfirmed ? 'DEPLOY WORKSPACE' : 'PROCEED TO CONFIRMATION'}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Confirm Overlay */}
                <AnimatePresence>
                    {isConfirmed && !isCreating && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="absolute inset-0 z-50 bg-[#0A0A0B]/95 backdrop-blur-xl p-12 flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 mb-8 border border-emerald-500/20">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Initialize Deployment?</h3>
                            <p className="text-sm text-gray-500 max-w-sm mb-12">
                                Your workspace "{watch('name')}" will be provisioned with {watch('llm_model')} and {watch('embedding_model')}.
                            </p>

                            <div className="flex flex-col gap-4 w-full max-w-xs">
                                <button
                                    onClick={handleSubmit((data) => onSubmit(data))}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-emerald-500/20 transition-all"
                                >
                                    CONFIRM DEPLOYMENT
                                </button>
                                <button
                                    onClick={() => setIsConfirmed(false)}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold text-sm transition-all"
                                >
                                    BACK TO CONFIG
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
