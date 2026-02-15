'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Zap, Database, Search, Share2, Cpu, 
    CheckCircle2, Info, AlertTriangle, ChevronRight,
    Layers, BarChart3, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateWorkspaceSchema, CreateWorkspaceInput } from '@/lib/schemas/workspaces';

// --- Backend Derived Constants ---

const LLM_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama3.2', 'qwen2.5:7b', 'mistral', 'custom'] },
    { id: 'vllm', name: 'vLLM', models: ['custom-inference-model'] },
    { id: 'llama-cpp', name: 'Llama.cpp', models: ['custom-local-model'] }
];

const EMBEDDING_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: [{ name: 'text-embedding-3-small', dim: 1536 }, { name: 'text-embedding-3-large', dim: 3072 }] },
    { id: 'voyage', name: 'Voyage AI', models: [{ name: 'voyage-large-2', dim: 1536 }, { name: 'voyage-code-2', dim: 1536 }] },
    { id: 'ollama', name: 'Ollama', models: [{ name: 'nomic-embed-text', dim: 768 }, { name: 'mxbai-embed-large', dim: 1024 }] },
    { id: 'local', name: 'Local (HF)', models: [{ name: 'BAAI/bge-large-en-v1.5', dim: 1024 }, { name: 'BAAI/bge-small-en-v1.5', dim: 384 }] }
];

const RERANK_PROVIDERS = [
    { id: 'none', name: 'Disabled' },
    { id: 'cohere', name: 'Cohere' },
    { id: 'jina', name: 'Jina AI' },
    { id: 'local', name: 'Local BGE-Reranker' }
];

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateWorkspaceInput) => Promise<void>;
    isCreating: boolean;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSubmit, isCreating }: CreateWorkspaceModalProps) {
    const [isConfirmed, setIsConfirmed] = useState(false);

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
            graph_enabled: false,
            reranker_enabled: false,
            reranker_provider: 'none',
            rerank_top_k: 3
        }
    });

    const { register, watch, setValue, handleSubmit, formState: { errors, isValid } } = form;

    const selectedLLMProvider = watch('llm_provider');
    const selectedEMBProvider = watch('embedding_provider');
    const selectedRerankProvider = watch('reranker_provider');

    // Sync models when provider changes
    useEffect(() => {
        const prov = LLM_PROVIDERS.find(p => p.id === selectedLLMProvider);
        if (prov && prov.models.length > 0) {
            setValue('llm_model', prov.models[0]);
        }
    }, [selectedLLMProvider, setValue]);

    useEffect(() => {
        const prov = EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider);
        if (prov && prov.models.length > 0) {
            setValue('embedding_model', prov.models[0].name);
            setValue('embedding_dim', prov.models[0].dim);
        }
    }, [selectedEMBProvider, setValue]);

    // Handle re-ranker toggle sync
    useEffect(() => {
        if (selectedRerankProvider === 'none') {
            setValue('reranker_enabled', false);
        } else {
            setValue('reranker_enabled', true);
        }
    }, [selectedRerankProvider, setValue]);

    if (!isOpen) return null;

    const currentValues = watch();

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
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex"
            >
                {/* Left Panel: Summary/Workflow View */}
                <div className="hidden lg:flex w-80 bg-white/[0.02] border-r border-white/5 p-8 flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Cpu className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-caption font-black text-white tracking-widest uppercase">KARAG</h3>
                                <p className="text-[10px] text-gray-500 font-bold">Workflow Designer</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-tiny font-black text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">Active Pipeline</h4>
                            
                            <WorkflowStep 
                                icon={Database} 
                                label="Source Ingestion" 
                                value={`${currentValues.chunk_size} chars / ${currentValues.chunk_overlap} overlap`}
                                status="immutable"
                            />
                            <WorkflowStep 
                                icon={Layers} 
                                label="Embedding" 
                                value={`${currentValues.embedding_provider} / ${currentValues.embedding_model}`}
                                status="immutable"
                            />
                            <WorkflowStep 
                                icon={Search} 
                                label="Retrieval" 
                                value={currentValues.rag_engine === 'graph' ? 'Hybrid + Knowledge Graph' : 'Hybrid Vector/Keyword'}
                            />
                            {currentValues.reranker_enabled && (
                                <WorkflowStep 
                                    icon={BarChart3} 
                                    label="Re-ranking" 
                                    value={`${currentValues.reranker_provider} (top ${currentValues.rerank_top_k})`}
                                />
                            )}
                            <WorkflowStep 
                                icon={Zap} 
                                label="Synthesis" 
                                value={`${currentValues.llm_provider} / ${currentValues.llm_model}`}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Architectural Constraint</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                            Embedding and Ingestion parameters are immutable once the workspace is created. Changing these requires a full re-index.
                        </p>
                    </div>
                </div>

                {/* Right Panel: Form Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-h3 font-black text-white tracking-tight">Design New Workspace</h2>
                            <p className="text-caption text-gray-500 font-bold">Configure your neural infrastructure</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {!isConfirmed ? (
                                <motion.form 
                                    key="form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-12"
                                >
                                    {/* 1. Basic Info */}
                                    <FormSection title="1. Identity & Scope" icon={Settings2}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-tiny font-black text-gray-400 uppercase tracking-widest ml-1">Workspace Name</label>
                                                <input
                                                    {...register('name')}
                                                    placeholder="e.g., Enterprise Brain"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-caption focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-gray-700 font-bold"
                                                />
                                                {errors.name && <p className="text-red-400 text-tiny font-bold ml-1">{errors.name.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-tiny font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                                <input
                                                    {...register('description')}
                                                    placeholder="What is the purpose of this workspace?"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-caption focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-gray-700 font-bold"
                                                />
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* 2. Provider Config */}
                                    <FormSection title="2. Core Configuration" icon={Cpu}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            {/* LLM Selection */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap size={14} className="text-amber-400" />
                                                    <h4 className="text-caption font-black text-white uppercase tracking-widest">Synthesis Node (LLM)</h4>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-tiny font-black text-gray-500 uppercase tracking-widest">Engine Provider</label>
                                                        <select
                                                            {...register('llm_provider')}
                                                            className="w-full bg-[#161618] border border-white/10 rounded-2xl px-5 py-4 text-caption outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                                                        >
                                                            {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-tiny font-black text-gray-500 uppercase tracking-widest">Target Model</label>
                                                        <select
                                                            {...register('llm_model')}
                                                            className="w-full bg-[#161618] border border-white/10 rounded-2xl px-5 py-4 text-caption outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                                                        >
                                                            {LLM_PROVIDERS.find(p => p.id === selectedLLMProvider)?.models.map(m => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Embedding Selection */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Database size={14} className="text-indigo-400" />
                                                    <h4 className="text-caption font-black text-white uppercase tracking-widest">Vector Node (Embedding)</h4>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-tiny font-black text-gray-500 uppercase tracking-widest">Embedding Provider</label>
                                                        <select
                                                            {...register('embedding_provider')}
                                                            className="w-full bg-[#161618] border border-white/10 rounded-2xl px-5 py-4 text-caption outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                                                        >
                                                            {EMBEDDING_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-tiny font-black text-gray-500 uppercase tracking-widest">Dimension Model</label>
                                                        <select
                                                            {...register('embedding_model')}
                                                            onChange={(e) => {
                                                                const modelName = e.target.value;
                                                                const prov = EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider);
                                                                const model = prov?.models.find(m => m.name === modelName);
                                                                if (model) {
                                                                    setValue('embedding_model', model.name);
                                                                    setValue('embedding_dim', model.dim);
                                                                }
                                                            }}
                                                            className="w-full bg-[#161618] border border-white/10 rounded-2xl px-5 py-4 text-caption outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                                                        >
                                                            {EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider)?.models.map(m => (
                                                                <option key={m.name} value={m.name}>{m.name} ({m.dim}d)</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* 3. Workflow Nodes */}
                                    <FormSection title="3. Workflow Nodes" icon={Layers}>
                                        <div className="space-y-6">
                                            {/* Search Node (Required) */}
                                            <NodeToggleCard 
                                                title="Search Node"
                                                icon={Search}
                                                description="Primary retrieval engine for context discovery."
                                                status="mandatory"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Search Mode</label>
                                                        <select 
                                                            {...register('rag_engine')}
                                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-tiny outline-none font-bold"
                                                        >
                                                            <option value="basic">Basic Hybrid (Vector + Keyword)</option>
                                                            <option value="graph">Enhanced Knowledge Graph + Vector</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top-K Limit</label>
                                                        <input 
                                                            type="number"
                                                            {...register('search_limit', { valueAsNumber: true })}
                                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-tiny outline-none font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </NodeToggleCard>

                                            {/* Re-ranking Node (Optional) */}
                                            <NodeToggleCard 
                                                title="Re-ranking Node"
                                                icon={BarChart3}
                                                description="Neural refinement of retrieved chunks to improve precision."
                                                status="optional"
                                                enabled={watch('reranker_enabled')}
                                                onToggle={(val) => {
                                                    setValue('reranker_enabled', val);
                                                    if (val && selectedRerankProvider === 'none') {
                                                        setValue('reranker_provider', 'cohere');
                                                    } else if (!val) {
                                                        setValue('reranker_provider', 'none');
                                                    }
                                                }}
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rerank Provider</label>
                                                        <select 
                                                            {...register('reranker_provider')}
                                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-tiny outline-none font-bold"
                                                        >
                                                            {RERANK_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Final Selection (K)</label>
                                                        <input 
                                                            type="number"
                                                            {...register('rerank_top_k', { valueAsNumber: true })}
                                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-tiny outline-none font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </NodeToggleCard>

                                            {/* Knowledge Node (Optional) */}
                                            <NodeToggleCard 
                                                title="Knowledge Graph Node"
                                                icon={Share2}
                                                description="Entity-relationship discovery and structural grounding."
                                                status="optional"
                                                enabled={watch('graph_enabled')}
                                                onToggle={(val) => {
                                                    setValue('graph_enabled', val);
                                                    if (val) setValue('rag_engine', 'graph');
                                                }}
                                            >
                                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                                    <p className="text-[10px] text-indigo-300/60 font-medium leading-relaxed">
                                                        Enable this to build a structured knowledge subgraph during retrieval. Requires Neo4j connectivity and entities discovery in ingestion phase.
                                                    </p>
                                                </div>
                                            </NodeToggleCard>
                                        </div>
                                    </FormSection>
                                </motion.form>
                            ) : (
                                <motion.div 
                                    key="confirmation"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10"
                                >
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600/10 flex items-center justify-center mb-4">
                                        <CheckCircle2 size={48} className="text-indigo-500" />
                                    </div>
                                    <div className="max-w-md space-y-4">
                                        <h2 className="text-h2 font-black text-white">Confirm Architecture</h2>
                                        <p className="text-caption text-gray-500 font-bold leading-relaxed">
                                            You are about to provision <span className="text-white">"{currentValues.name}"</span> with a 
                                            <span className="text-indigo-400"> {currentValues.rag_engine}</span> retrieval pipeline 
                                            powered by <span className="text-amber-400">{currentValues.llm_model}</span>.
                                        </p>
                                    </div>

                                    <div className="w-full max-w-xl grid grid-cols-2 gap-4 text-left">
                                        <SummaryCard label="Providers" value={`${currentValues.llm_provider} + ${currentValues.embedding_provider}`} />
                                        <SummaryCard label="Retrieval" value={currentValues.rag_engine.toUpperCase()} />
                                        <SummaryCard label="Dimension" value={`${currentValues.embedding_dim}d Vector Space`} />
                                        <SummaryCard label="Topology" value={`${Object.values(currentValues).filter(v => v === true).length} Nodes Active`} />
                                    </div>

                                    <p className="text-tiny text-gray-600 font-bold uppercase tracking-widest pt-4">
                                        Press Deploy to finalize neural configuration.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-8 border-t border-white/5 bg-black/20 flex items-center justify-between">
                        <button
                            onClick={isConfirmed ? () => setIsConfirmed(false) : onClose}
                            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all font-black text-tiny tracking-widest"
                        >
                            {isConfirmed ? 'REVISE CONFIG' : 'CANCEL'}
                        </button>
                        
                        <button
                            onClick={handleSubmit(handleFormSubmit)}
                            disabled={isCreating || (!isValid && !isConfirmed)}
                            className={cn(
                                "flex items-center gap-3 px-10 py-4 rounded-2xl text-tiny font-black tracking-widest transition-all",
                                isConfirmed 
                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30" 
                                    : "bg-white text-black hover:bg-gray-200"
                            )}
                        >
                            {isCreating ? (
                                <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                        <Cpu size={16} />
                                    </motion.div>
                                    PROVISIONING...
                                </>
                            ) : (
                                <>
                                    {isConfirmed ? 'DEPLOY WORKSPACE' : 'PROCEED TO CONFIRMATION'}
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// --- Internal Helper Components ---

function WorkflowStep({ icon: Icon, label, value, status }: { icon: any, label: string, value: string, status?: 'immutable' }) {
    return (
        <div className="flex gap-4">
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-indigo-500/30 transition-all">
                <Icon size={14} className="text-gray-500" />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest truncate">{label}</p>
                    {status === 'immutable' && <span className="w-1 h-1 rounded-full bg-amber-500/50" />}
                </div>
                <p className="text-tiny font-bold text-gray-400 truncate mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function FormSection({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Icon size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-caption font-black text-white uppercase tracking-[0.2em]">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function NodeToggleCard({ title, icon: Icon, description, status, enabled = true, onToggle, children }: any) {
    return (
        <div className={cn(
            "p-6 rounded-3xl border transition-all duration-500",
            enabled ? "bg-white/[0.03] border-white/10" : "bg-black/40 border-white/5 opacity-50"
        )}>
            <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        enabled ? "bg-indigo-600/20 text-indigo-400" : "bg-white/5 text-gray-600"
                    )}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="text-caption font-black text-white uppercase tracking-widest">{title}</h4>
                            <span className={cn(
                                "text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest",
                                status === 'mandatory' ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-gray-500"
                            )}>
                                {status}
                            </span>
                        </div>
                        <p className="text-tiny text-gray-500 font-bold mt-1">{description}</p>
                    </div>
                </div>
                {status === 'optional' && onToggle && (
                    <button
                        type="button"
                        onClick={() => onToggle(!enabled)}
                        className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            enabled ? "bg-indigo-600" : "bg-white/10 border border-white/10"
                        )}
                    >
                        <motion.div
                            animate={{ x: enabled ? 26 : 4 }}
                            className="w-4 h-4 rounded-full bg-white absolute top-1"
                        />
                    </button>
                )}
            </div>
            {enabled && children && (
                <div className="pt-2">
                    {children}
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">{label}</p>
            <p className="text-caption font-black text-white truncate">{value}</p>
        </div>
    );
}
