'use client';

import React, { useState, useEffect } from 'react';
import { useTasks, TaskItem } from '@/context/task-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown,
    RefreshCw, X, Layers, FileText, ArrowRightLeft, Database, Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

function getTaskIcon(task: TaskItem) {
    const op = task.metadata.operation || task.type;
    switch (op) {
        case 'index':
        case 'indexing':
            return <Database size={14} className="text-cyan-400" />;
        case 'link':
            return <ArrowRightLeft size={14} className="text-indigo-400" />;
        case 'move':
        case 'share':
            return <Layers size={14} className="text-amber-400" />;
        default:
            return <FileText size={14} className="text-blue-400" />;
    }
}

function getTaskLabel(task: TaskItem): string {
    const filename = task.metadata.filename || 'Unknown';
    const op = task.metadata.operation || task.type;
    switch (op) {
        case 'ingestion':
            return `Ingesting ${filename}`;
        case 'index':
        case 'indexing':
            return `Indexing ${filename}`;
        case 'link':
            return `Linking ${filename}`;
        case 'move':
            return `Moving ${filename}`;
        case 'share':
            return `Sharing ${filename}`;
        case 'workspace_op':
            return `${task.metadata.operation || 'Processing'} ${filename}`;
        default:
            return `Processing ${filename}`;
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case 'pending':
        case 'processing':
            return 'text-blue-400';
        case 'completed':
            return 'text-emerald-400';
        case 'failed':
            return 'text-red-400';
        case 'canceled':
            return 'text-gray-500';
        default:
            return 'text-gray-400';
    }
}

interface TaskRowProps {
    task: TaskItem;
    onDismiss: () => void;
    onRetry?: () => void;
    onCancel?: () => void;
}

function TaskRow({ task, onDismiss, onRetry, onCancel }: TaskRowProps) {
    const isActive = task.status === 'pending' || task.status === 'processing';
    const isFailed = task.status === 'failed';
    const isCompleted = task.status === 'completed';
    const isCanceled = task.status === 'canceled';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "px-4 py-3 border-b border-white/5 last:border-b-0 group transition-all duration-300",
                isFailed && "bg-red-500/[0.03] hover:bg-red-500/[0.06]",
                !isActive && "hover:bg-white/[0.02]",
                isCanceled && "opacity-50"
            )}
        >
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="shrink-0">
                    {isActive ? (
                        <Loader2 size={14} className="animate-spin text-blue-400" />
                    ) : isCompleted ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : isFailed ? (
                        <XCircle size={14} className="text-red-400" />
                    ) : (
                        getTaskIcon(task)
                    )}
                </div>

                {/* Label + Message */}
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white/80 truncate uppercase tracking-wider">
                        {getTaskLabel(task)}
                    </div>
                    <div className={cn("text-[10px] truncate mt-0.5", getStatusColor(task.status))}>
                        {task.message}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {isActive && onCancel && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancel(); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-all"
                            title="Stop Current Progress"
                        >
                            <Square size={10} fill="currentColor" />
                        </button>
                    )}
                    {isFailed && onRetry && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRetry(); }}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500/50 hover:text-amber-500 transition-all"
                            title="Retry Operation"
                        >
                            <RefreshCw size={12} />
                        </button>
                    )}
                    {!isActive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                isFailed
                                    ? "text-gray-500 hover:text-gray-300 hover:bg-white/10"
                                    : "opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-400 hover:bg-white/10"
                            )}
                            title="Remove from List"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {isActive && (
                <div className="mt-2 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                </div>
            )}
        </motion.div>
    );
}

export function JobPanel() {
    const {
        activeTasks,
        recentCompletedTasks,
        failedTasks,
        hasActiveWork,
        dismissTask,
        retryTask,
        cancelTask
    } = useTasks();
    const [isExpanded, setIsExpanded] = useState(false);
    const [wasActive, setWasActive] = useState(false);

    // Filter tasks that should be visible
    const allVisibleTasks = [...activeTasks, ...failedTasks, ...recentCompletedTasks];
    const totalVisible = allVisibleTasks.length;

    // Auto-expand when new work starts
    useEffect(() => {
        if (hasActiveWork && !wasActive) {
            setIsExpanded(true);
        }
        setWasActive(hasActiveWork);
    }, [hasActiveWork, wasActive]);

    // Don't render if nothing to show
    if (totalVisible === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full pointer-events-none">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="pointer-events-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-[#0f0f11]/95 backdrop-blur-xl"
            >
                {/* Header / Collapsed Indicator */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {hasActiveWork ? (
                            <div className="relative">
                                <Loader2 size={16} className="animate-spin text-blue-400" />
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            </div>
                        ) : failedTasks.length > 0 ? (
                            <XCircle size={16} className="text-red-400" />
                        ) : (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                        )}
                        <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                            {hasActiveWork
                                ? `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} running`
                                : failedTasks.length > 0
                                    ? `${failedTasks.length} failed`
                                    : 'All tasks complete'
                            }
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {totalVisible > 0 && (
                            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                {totalVisible}
                            </span>
                        )}
                        {isExpanded ? (
                            <ChevronDown size={14} className="text-gray-500" />
                        ) : (
                            <ChevronUp size={14} className="text-gray-500" />
                        )}
                    </div>
                </button>

                {/* Expanded Task List */}
                <AnimatePresence initial={false} mode="popLayout">
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex flex-col-reverse">
                                {allVisibleTasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onDismiss={() => dismissTask(task.id)}
                                        onRetry={task.status === 'failed' ? () => retryTask(task.id) : undefined}
                                        onCancel={(task.status === 'pending' || task.status === 'processing') ? () => cancelTask(task.id) : undefined}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
