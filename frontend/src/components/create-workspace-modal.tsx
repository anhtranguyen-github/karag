'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Settings2, Database,
    Shield, Cpu, Loader2, Zap, Globe
} from 'lucide-react';
import { CreateWorkspaceInput, CreateWorkspaceSchema } from '@/lib/schemas/workspaces';
import { cn } from '@/lib/utils';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateWorkspaceInput) => Promise<void>;
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

const FormSection = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="space-y-8">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-600/5">
                <Icon size={18} />
            </div>
            <h3 className="text-tiny font-black text-white uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <div className="pl-14 space-y-10">
            {children}
        </div>
    </div>
);

export const CreateWorkspaceModal = ({ isOpen, onClose, onSubmit, isCreating }: CreateWorkspaceModalProps) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    const form = useForm<CreateWorkspaceInput>({
        mode: 'onBlur',
        resolver: zodResolver(CreateWorkspaceSchema),
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

    const { register, watch, setValue, handleSubmit, formState: { errors } } = form;

    const selectedLLMProvider = watch('llm_provider');
    const selectedEMBProvider = watch('embedding_provider');
    const workspaceName = watch('name');

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                className="relative w-full max-w-5xl h-[85vh] bg-[#0d0d0e] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden flex flex-col"
            >
                {/* Header Profile */}
                <header className="px-10 py-10 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2.2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/20">
                            <Plus size={32} />
                        </div>
                        <div>
                            <h2 className="text-h3 font-black text-white uppercase tracking-tighter">Initialize Intelligence Cluster</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] ">Provisioning Protocol</span>
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest ">Admin Authority Level 4</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all border border-white/5 active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </header>

                {/* Configuration Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:px-20">
                    <form className="max-w-4xl mx-auto space-y-24">
                        {/* Section 1: Identity */}
                        <FormSection title="01 / IDENTITY" icon={Globe}>
                            <div className="grid gap-10">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-tiny font-black text-gray-500 uppercase tracking-widest">Workspace Designation</label>
                                        {errors.name && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">Required</span>}
                                    </div>
                                    <input
                                        {...register('name')}
                                        type="text"
                                        placeholder="e.g. QUANTUM_ANALYTICS"
                                        className={cn(
                                            "w-full bg-[#0a0a0b] border-2 rounded-[1.5rem] px-8 py-5 text-h3 font-black text-white outline-none transition-all placeholder:text-gray-800",
                                            errors.name ? "border-red-500/30 ring-4 ring-red-500/5" : "border-white/5 focus:border-blue-500/50 focus:ring-4 ring-blue-500/5 focus:bg-[#0d0d0e]"
                                        )}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-tiny font-black text-gray-500 uppercase tracking-widest px-1">Strategic Logic / Description</label>
                                    <textarea
                                        {...register('description')}
                                        rows={3}
                                        placeholder="Define the structural purpose of this intelligence core..."
                                        className="w-full bg-[#0a0a0b] border border-white/5 rounded-[1.5rem] px-8 py-5 text-caption font-medium text-gray-400 outline-none focus:border-blue-500/30 focus:ring-4 ring-blue-500/5 transition-all resize-none placeholder:text-gray-800"
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* Section 2: Neural Stack */}
                        <FormSection title="02 / NEURAL_STACK" icon={Cpu}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Reasoning Provider</label>
                                        <select
                                            {...register('llm_provider')}
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl px-6 py-4 text-tiny font-black text-white hover:border-white/20 transition-all outline-none"
                                        >
                                            {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id} className="bg-[#0A0A0B]">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Intelligence Model</label>
                                        <select
                                            {...register('llm_model')}
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl px-6 py-4 text-tiny font-black text-white hover:border-white/20 transition-all outline-none"
                                        >
                                            {LLM_PROVIDERS.find(p => p.id === selectedLLMProvider)?.models.map(m => (
                                                <option key={m} value={m} className="bg-[#0A0A0B]">{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Vectorization Base</label>
                                        <select
                                            {...register('embedding_provider')}
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl px-6 py-4 text-tiny font-black text-white hover:border-white/20 transition-all outline-none"
                                        >
                                            {EMBEDDING_PROVIDERS.map(p => <option key={p.id} value={p.id} className="bg-[#0A0A0B]">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Geometric Map (Dimensions)</label>
                                        <select
                                            {...register('embedding_model', {
                                                onChange: (e) => {
                                                    const modelName = e.target.value;
                                                    const prov = EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider);
                                                    const model = prov?.models.find(m => m.name === modelName);
                                                    if (model) setValue('embedding_dim', model.dim);
                                                }
                                            })}
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl px-6 py-4 text-tiny font-black text-white hover:border-white/20 transition-all outline-none"
                                        >
                                            {EMBEDDING_PROVIDERS.find(p => p.id === selectedEMBProvider)?.models.map(m => (
                                                <option key={m.name} value={m.name} className="bg-[#0A0A0B]">{m.name} ({m.dim}d)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* Section 3: RAG Protocol */}
                        <FormSection title="03 / RAG_PROTOCOL" icon={Database}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Extraction Methodology</label>
                                        <select
                                            {...register('rag_engine')}
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl px-6 py-4 text-tiny font-black text-white hover:border-white/20 outline-none"
                                        >
                                            <option value="basic" className="bg-[#0A0A0B]">Hybrid Vector (Optimized)</option>
                                            <option value="graph" className="bg-[#0A0A0B]">Knowledge Graph (Relational)</option>
                                        </select>
                                    </div>

                                    <div className="grid gap-4">
                                        <ToggleSwitch
                                            label="Relational Entity Extraction"
                                            description="Enable Neo4j graph construction"
                                            checked={watch('graph_enabled')}
                                            onChange={(val) => setValue('graph_enabled', val)}
                                        />
                                        <ToggleSwitch
                                            label="Autonomous Task Planning"
                                            description="Enable multi-step agentic search"
                                            checked={watch('agentic_enabled')}
                                            onChange={(val) => setValue('agentic_enabled', val)}
                                        />
                                    </div>
                                </div>

                                <div className="p-10 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 flex flex-col gap-8">
                                    <div className="flex items-center gap-3">
                                        <Settings2 size={16} className="text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Ingestion Specs</span>
                                    </div>
                                    <div className="grid gap-8">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">
                                                <span>Chunk Magnitude</span>
                                                <span className="text-white">{watch('chunk_size')} CHARS</span>
                                            </div>
                                            <input type="range" min="200" max="4000" step="100" {...register('chunk_size', { valueAsNumber: true })} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">
                                                <span>Overlap Factor</span>
                                                <span className="text-white">{watch('chunk_overlap')} CHARS</span>
                                            </div>
                                            <input type="range" min="0" max="1000" step="50" {...register('chunk_overlap', { valueAsNumber: true })} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </form>
                </div>

                {/* Footer Interaction */}
                <footer className="px-10 py-10 border-t border-white/5 bg-[#0d0d0e]/80 backdrop-blur-3xl z-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-2xl transition-all",
                            workspaceName ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-white/5 text-gray-600 border border-white/5"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", workspaceName ? "bg-emerald-500" : "bg-gray-600")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{workspaceName ? 'CALIBRATION COMPLETE' : 'SYSTEM PENDING'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-8 py-4 text-tiny font-black text-gray-600 hover:text-white transition-all uppercase tracking-widest">
                            Abort
                        </button>
                        <button
                            onClick={() => setIsConfirmed(true)}
                            disabled={isCreating || !workspaceName}
                            className="h-14 px-10 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white text-tiny font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                        >
                            {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            {isCreating ? 'INITIALIZING...' : 'PROCEED TO DEPLOYMENT'}
                        </button>
                    </div>
                </footer>

                {/* Secure Deployment Overlay */}
                <AnimatePresence>
                    {isConfirmed && !isCreating && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[200] bg-[#0A0A0B]/95 backdrop-blur-2xl flex items-center justify-center p-12"
                        >
                            <div className="max-w-xl w-full text-center space-y-12">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-3xl shadow-emerald-500/10">
                                    <Shield size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-h2 font-black text-white uppercase tracking-tighter">Commit Deployment?</h3>
                                    <p className="text-caption text-gray-500 font-medium">Provisioning <span className="text-white font-bold">{watch('name')}</span> with <span className="text-blue-500 font-bold">{watch('llm_model')}</span> logic and <span className="text-indigo-400 font-bold">{watch('embedding_dim')}d</span> vector space.</p>
                                </div>

                                <div className="grid gap-4">
                                    <button
                                        onClick={handleSubmit((data) => onSubmit(data))}
                                        className="w-full py-6 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black text-tiny tracking-[0.3em] uppercase shadow-2xl shadow-blue-600/20 transition-all active:scale-95"
                                    >
                                        INITIALIZE KERNEL
                                    </button>
                                    <button
                                        onClick={() => setIsConfirmed(false)}
                                        className="w-full py-6 rounded-3xl bg-white/5 border border-white/5 text-gray-500 font-black text-tiny tracking-[0.2em] uppercase hover:bg-white/10 transition-all"
                                    >
                                        RECALIBRATE
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

function ToggleSwitch({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={(e) => { e.preventDefault(); onChange(!checked); }}
            className={cn(
                "flex items-center justify-between p-6 rounded-2xl border transition-all text-left",
                checked ? "bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-600/5 text-blue-400" : "bg-black border-white/5 text-gray-600"
            )}
        >
            <div>
                <p className="text-[11px] font-black uppercase tracking-tight">{label}</p>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">{description}</p>
            </div>
            <div className={cn("w-10 h-5 rounded-full p-1 transition-all relative", checked ? "bg-blue-500" : "bg-white/10")}>
                <div className={cn("w-3 h-3 rounded-full bg-white transition-all", checked ? "ml-5" : "ml-0")} />
            </div>
        </button>
    );
}
