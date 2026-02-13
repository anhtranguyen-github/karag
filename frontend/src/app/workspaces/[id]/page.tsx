'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    MessageSquare, FileText, Settings, Zap, Database,
    Clock, ArrowRight, Loader2, type LucideIcon
} from 'lucide-react';
import { API_ROUTES } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface Thread {
    id: string;
    title?: string;
    updated_at?: string;
    message_count?: number;
}

interface DocumentSummary {
    id: string;
    filename: string;
    name?: string;
    chunks?: number;
    status?: string;
}

interface WorkspaceDetail {
    id: string;
    name: string;
    description: string;
    stats: {
        thread_count: number;
        doc_count: number;
    };
    settings: {
        rag_engine: string;
        embedding_provider: string;
        embedding_model: string;
        embedding_dim: number;
        chunk_size: number;
        chunk_overlap: number;
        llm_provider: string;
        llm_model: string;
    };
    threads: Thread[];
    documents: DocumentSummary[];
}

export default function WorkspaceOverviewPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorkspace = async () => {
            if (!workspaceId) return;
            setIsLoading(true);
            try {
                const res = await fetch(API_ROUTES.WORKSPACE_STATS(workspaceId));
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        setWorkspace(result.data);
                    } else {
                        console.error('API Error:', result.message);
                    }
                } else {
                    console.error('HTTP Error:', res.status);
                }
            } catch (err) {
                console.error('Failed to fetch workspace:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkspace();
    }, [workspaceId]);


    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400">Workspace not found</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-h3 font-bold text-white">{workspace.name}</h1>
                        <p className="text-gray-500 mt-1">
                            {workspace.description || `Workspace ID: ${workspace.id}`}
                        </p>
                    </div>
                    {workspace.id === 'default' && (
                        <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-tiny font-medium">
                            System Default
                        </span>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Documents"
                        value={workspace.stats.doc_count.toString()}
                        icon={FileText}
                        color="blue"
                    />
                    <StatCard
                        label="Chat Threads"
                        value={workspace.stats.thread_count.toString()}
                        icon={MessageSquare}
                        color="green"
                    />
                    <StatCard
                        label="RAG Engine"
                        value={workspace.settings.rag_engine.toUpperCase()}
                        icon={Zap}
                        color="yellow"
                    />
                    <StatCard
                        label="Embedding Dim"
                        value={workspace.settings.embedding_dim.toString()}
                        icon={Database}
                        color="purple"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ActionCard
                        href={`/workspaces/${workspaceId}/chat`}
                        title="Start Chat"
                        description="Ask questions about your documents"
                        icon={MessageSquare}
                    />
                    <ActionCard
                        href={`/workspaces/${workspaceId}/documents`}
                        title="Manage Documents"
                        description="Upload, view, and organize files"
                        icon={FileText}
                    />
                    <ActionCard
                        href={`/workspaces/${workspaceId}/settings`}
                        title="Settings"
                        description="Configure RAG and LLM options"
                        icon={Settings}
                    />
                </div>

                {/* Configuration Summary */}
                <div className="bg-[#121214] rounded-xl border border-white/5 p-5">
                    <h3 className="text-caption font-semibold text-gray-300 mb-4 flex items-center gap-2">
                        <Settings size={16} className="text-gray-500" />
                        Current Configuration
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-caption">
                        <ConfigItem label="LLM Provider" value={workspace.settings.llm_provider} />
                        <ConfigItem label="LLM Model" value={workspace.settings.llm_model} />
                        <ConfigItem label="Embedding" value={workspace.settings.embedding_model} />
                        <ConfigItem label="Chunk Size" value={`${workspace.settings.chunk_size} chars`} />
                        <ConfigItem label="Chunk Overlap" value={`${workspace.settings.chunk_overlap} chars`} />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Threads */}
                    <div className="bg-[#121214] rounded-xl border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-caption font-semibold text-gray-300 flex items-center gap-2">
                                <Clock size={16} className="text-gray-500" />
                                Recent Chats
                            </h3>
                            <Link
                                href={`/workspaces/${workspaceId}/chat`}
                                className="text-tiny text-blue-400 hover:underline"
                            >
                                View All
                            </Link>
                        </div>
                        {workspace.threads.length === 0 ? (
                            <p className="text-caption text-gray-600">No chat history yet</p>
                        ) : (
                            <div className="space-y-2">
                                {workspace.threads.slice(0, 5).map((thread: Thread) => (
                                    <Link
                                        key={thread.id}
                                        href={`/workspaces/${workspaceId}/chat/${thread.id}`}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all"
                                    >
                                        <MessageSquare size={14} className="text-gray-500" />
                                        <span className="text-caption text-gray-300 truncate flex-1">
                                            {thread.title || `Chat ${thread.id}`}
                                        </span>
                                        <ArrowRight size={14} className="text-gray-600" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Documents */}
                    <div className="bg-[#121214] rounded-xl border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-caption font-semibold text-gray-300 flex items-center gap-2">
                                <FileText size={16} className="text-gray-500" />
                                Recent Documents
                            </h3>
                            <Link
                                href={`/workspaces/${workspaceId}/documents`}
                                className="text-tiny text-blue-400 hover:underline"
                            >
                                View All
                            </Link>
                        </div>
                        {workspace.documents.length === 0 ? (
                            <p className="text-caption text-gray-600">No documents uploaded yet</p>
                        ) : (
                            <div className="space-y-2">
                                {workspace.documents.slice(0, 5).map((doc: DocumentSummary) => (
                                    <Link
                                        key={doc.id}
                                        href={`/workspaces/${workspaceId}/documents/${doc.id}`}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all"
                                    >
                                        <FileText size={14} className="text-gray-500" />
                                        <span className="text-caption text-gray-300 truncate flex-1">
                                            {doc.name || doc.filename}
                                        </span>
                                        <span className={cn(
                                            "text-tiny px-2 py-0.5 rounded",
                                            doc.status === 'indexed' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                        )}>
                                            {doc.status}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-500',
        green: 'bg-green-500/10 text-green-500',
        yellow: 'bg-yellow-500/10 text-yellow-500',
        purple: 'bg-purple-500/10 text-purple-500',
    };

    return (
        <div className="bg-[#121214] rounded-xl border border-white/5 p-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", colorClasses[color])}>
                <Icon size={20} />
            </div>
            <div className="text-h3 font-bold text-white">{value}</div>
            <div className="text-tiny text-gray-500 uppercase">{label}</div>
        </div>
    );
}

function ActionCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: LucideIcon }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-4 p-5 bg-[#121214] rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-white/5 transition-all group"
        >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <Icon size={24} className="text-blue-500" />
            </div>
            <div className="flex-1">
                <h4 className="text-white font-medium">{title}</h4>
                <p className="text-caption text-gray-500">{description}</p>
            </div>
            <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-all" />
        </Link>
    );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-tiny text-gray-600 uppercase">{label}</div>
            <div className="text-gray-300">{value}</div>
        </div>
    );
}
