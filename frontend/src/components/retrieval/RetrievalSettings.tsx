import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import { Search, RotateCcw, Network, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchemaForm } from '@/components/ui/schema-form';
import { RETRIEVAL_SCHEMAS } from '@/lib/schemas/ui-schemas';

interface RetrievalSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function RetrievalSettings({ form }: RetrievalSettingsProps) {
    'use no memo';

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";
    const subSectionClass = "mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50";

    return (
        <div className="space-y-0 pb-10">
            {/* 1. Base Retrieval */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Search size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Base Retrieval</h3>
                    </div>
                </div>

                <div className="space-y-6 px-2">
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.vector} gridCols={2} />
                    </div>
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.bm25} gridCols={2} />
                    </div>
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.hybrid} gridCols={2} />
                    </div>
                </div>
            </div>

            {/* 2. Re-ranking */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <RotateCcw size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Re-ranking</h3>
                    </div>
                </div>

                <div className="px-2">
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.rerank} gridCols={2} />
                    </div>
                </div>
            </div>

            {/* 3. Graph Retrieval */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Network size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Graph Retrieval</h3>
                    </div>
                </div>

                <div className="px-2">
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.graph} gridCols={2} />
                    </div>
                </div>
            </div>

            {/* 4. Advanced Parameters */}
            <div className={sectionClass}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Settings2 size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Advanced Query Parameters</h3>
                    </div>
                </div>

                <div className="px-2">
                    <div className={subSectionClass}>
                        <SchemaForm schema={RETRIEVAL_SCHEMAS.advanced} gridCols={2} />
                    </div>
                </div>
            </div>
        </div>
    );
}
