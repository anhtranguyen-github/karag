'use client';

import React, { useState } from 'react';
import { useTools, ToolDefinition } from '@/hooks/use-tools';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Trash2, Power,
    Hammer, Terminal, Globe, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToolsManager({ onClose }: { onClose?: () => void }) {
    const { tools, toggleTool, addTool, deleteTool } = useTools();
    const [isAdding, setIsAdding] = useState(false);
    const [newTool, setNewTool] = useState<Partial<ToolDefinition>>({
        name: '',
        description: '',
        type: 'custom',
        enabled: true,
        config: {}
    });

    const handleToggle = (id: string, current: boolean) => {
        toggleTool(id, !current);
    };

    const handleAdd = async () => {
        if (!newTool.name || !newTool.id) return;
        const success = await addTool(newTool as ToolDefinition);
        if (success) setIsAdding(false);
    };

    const content = (
        <motion.div
            initial={onClose ? { opacity: 0, scale: 0.95, y: 20 } : {}}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={onClose ? { opacity: 0, scale: 0.95, y: 20 } : {}}
            className={cn(
                "relative bg-[#121214] border border-white/10 w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col",
                onClose ? "max-w-2xl max-h-[90vh]" : "h-full"
            )}
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-50" />

            <div className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-600/20">
                        <Hammer className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-h3 font-black text-white tracking-tight ">Capability Forge</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-tiny font-bold text-gray-500  tracking-[0.2em]">Tool Integration Layer</span>
                            <span className="w-1 h-1 rounded-full bg-orange-500/50 animate-pulse" />
                            <span className="text-tiny text-amber-400 ">{tools.length} Active Modules</span>
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 active:scale-90"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-8 bg-white/[0.005]">
                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div
                            key="add-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-6">
                                <h3 className="text-tiny font-black text-gray-500  tracking-[0.25em] border-b border-white/5 pb-2">Manifest New Module</h3>

                                <div className="grid gap-6">
                                    <div className="space-y-3">
                                        <label className="text-tiny font-black text-gray-600   ml-1">Internal Reference ID</label>
                                        <div className="relative group">
                                            <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-amber-500 transition-colors" size={18} />
                                            <input
                                                placeholder="e.g. system-optimizer"
                                                className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-caption text-white outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500/50 transition-all font-medium"
                                                value={newTool.id || ''}
                                                onChange={e => setNewTool({ ...newTool, id: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-tiny font-black text-gray-600   ml-1">Display Name</label>
                                        <input
                                            placeholder="Architecture Optimizer"
                                            className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 py-5 text-caption text-white outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500/50 transition-all font-medium"
                                            value={newTool.name || ''}
                                            onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-tiny font-black text-gray-600   ml-1">Functional Description</label>
                                        <textarea
                                            placeholder="Briefly explain what this module performs..."
                                            className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 py-5 text-caption text-white outline-none focus:ring-2 ring-amber-500/20 focus:border-amber-500/50 transition-all font-medium h-32 resize-none"
                                            value={newTool.description || ''}
                                            onChange={e => setNewTool({ ...newTool, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-tiny font-black text-gray-600   ml-1">Module Protocol</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { id: 'custom', label: 'Architecture Hook', sub: 'Native API/Function' },
                                                { id: 'mcp', label: 'MCP Connector', sub: 'Model Context Protocol' }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setNewTool({ ...newTool, type: type.id as 'custom' | 'mcp' })}
                                                    className={cn(
                                                        "p-5 rounded-2xl border text-left transition-all",
                                                        newTool.type === type.id
                                                            ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20"
                                                            : "bg-[#0a0a0b] border-white/5 text-gray-600 hover:border-white/10"
                                                    )}
                                                >
                                                    <div className="text-tiny font-black   mb-1">{type.label}</div>
                                                    <div className={cn("text-tiny font-bold", newTool.type === type.id ? "text-amber-100/50" : "text-gray-700")}>{type.sub}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-6 py-4 text-tiny font-black   text-gray-500 hover:text-white transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="px-10 py-4 bg-white text-black text-tiny font-black  tracking-[0.2em] rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Seal Integration
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <h3 className="text-tiny font-black text-gray-500  tracking-[0.25em] border-b border-white/5 pb-2">Integrated Modules</h3>
                            <div className="grid gap-4">
                                {tools.map(tool => (
                                    <div
                                        key={tool.id}
                                        className={cn(
                                            "group flex items-center justify-between p-6 rounded-[2rem] border transition-all relative overflow-hidden",
                                            tool.enabled
                                                ? "bg-white border-white shadow-xl"
                                                : "bg-[#0a0a0b] border-white/5 grayscale"
                                        )}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={cn(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                                tool.enabled ? "bg-black text-white" : "bg-white/5 text-gray-700"
                                            )}>
                                                {tool.type === 'system' ? <Settings size={22} /> :
                                                    tool.type === 'mcp' ? <Globe size={22} /> :
                                                        <Terminal size={22} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className={cn("text-caption font-black  tracking-tight", tool.enabled ? "text-black" : "text-gray-500")}>{tool.name}</h4>
                                                    <span className={cn(
                                                        "text-tiny px-2 py-0.5 rounded-full font-black  ",
                                                        tool.enabled ? "bg-black/5 text-black/40" : "bg-white/5 text-gray-700"
                                                    )}>
                                                        {tool.type}
                                                    </span>
                                                </div>
                                                <p className={cn("text-tiny font-medium mt-1 max-w-[300px] line-clamp-1", tool.enabled ? "text-gray-600" : "text-gray-700")}>{tool.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 relative z-10">
                                            <button
                                                onClick={() => handleToggle(tool.id, tool.enabled)}
                                                className={cn(
                                                    "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90",
                                                    tool.enabled
                                                        ? "bg-black/10 text-black hover:bg-black hover:text-white"
                                                        : "bg-white/5 text-gray-700 hover:text-white hover:bg-white/10"
                                                )}
                                            >
                                                <Power size={20} />
                                            </button>
                                            {tool.type !== 'system' && (
                                                <button
                                                    onClick={() => deleteTool(tool.id)}
                                                    className="w-12 h-12 flex items-center justify-center rounded-2xl text-gray-300 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            {!isAdding && (
                <div className="px-10 py-8 border-t border-white/5 bg-white/[0.01]">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full h-16 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] border border-dashed border-white/10 text-gray-500 hover:text-white transition-all flex items-center justify-center gap-4 group"
                    >
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={18} />
                        </div>
                        <span className="text-tiny font-black  tracking-[0.25em]">Forge New Capability Hook</span>
                    </button>
                </div>
            )}
        </motion.div>
    );

    if (onClose) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md"
                />
                {content}
            </div>
        );
    }

    return content;
}
