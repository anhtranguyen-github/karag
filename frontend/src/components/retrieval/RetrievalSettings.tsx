import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormField,
    FormItem,
    FormLabel,
    FormDescription
} from '@/components/ui/form';
import { CreateWorkspaceInput } from '@/lib/schemas/workspaces';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Search, RotateCcw, Network, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetrievalSettingsProps {
    form: UseFormReturn<CreateWorkspaceInput>;
}

export function RetrievalSettings({ form }: RetrievalSettingsProps) {
    const showVector = form.watch('retrieval.vector.enabled');
    const showBM25 = form.watch('retrieval.bm25.enabled');
    const showHybrid = form.watch('retrieval.hybrid.enabled');
    const showRerank = form.watch('retrieval.rerank.enabled');
    const showGraph = form.watch('retrieval.graph.enabled');

    const sectionClass = "p-5 rounded-2xl bg-card border border-border shadow-sm mb-6";
    const subSectionClass = "mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300";
    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";
    const switchRowClass = "flex items-center justify-between pb-3 last:pb-0 last:border-0 border-b border-border/20";

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

                <div className="space-y-4 px-2">
                    {/* Dense Vector Toggle */}
                    <div className={switchRowClass}>
                        <div className="space-y-0.5">
                            <FormLabel className="text-xs font-bold">Dense Vector Search</FormLabel>
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.vector.enabled"
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                    </div>

                    {showVector && (
                        <div className={subSectionClass}>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="retrieval.vector.top_k"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Vector Top K</FormLabel>
                                            <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="retrieval.vector.similarity_metric"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Metric</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cosine">Cosine</SelectItem>
                                                    <SelectItem value="dot">Dot</SelectItem>
                                                    <SelectItem value="l2">L2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Sparse BM25 Toggle */}
                    <div className={switchRowClass}>
                        <div className="space-y-0.5">
                            <FormLabel className="text-xs font-bold">Sparse BM25 Search</FormLabel>
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.bm25.enabled"
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                    </div>

                    {showBM25 && (
                        <div className={subSectionClass}>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="retrieval.bm25.top_k"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>BM25 Top K</FormLabel>
                                            <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="retrieval.bm25.min_term_match"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Min Match</FormLabel>
                                            <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Hybrid Fusion */}
                    <div className="pt-4 mt-4 border-t border-border/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="space-y-0.5 text-indigo-500">
                                <FormLabel className="text-xs font-black uppercase tracking-widest">Hybrid Fusion</FormLabel>
                            </div>
                            <FormField
                                control={form.control}
                                name="retrieval.hybrid.enabled"
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                            />
                        </div>

                        {showHybrid && (
                            <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 space-y-5 animate-in zoom-in-95 duration-300">
                                <FormField
                                    control={form.control}
                                    name="retrieval.hybrid.dense_weight"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between text-[10px] mb-2 font-bold tracking-tight">
                                                <FormLabel className="text-muted-foreground uppercase">Dense vs Sparse Weight</FormLabel>
                                                <span className="text-indigo-500">{(field.value * 100).toFixed(0)}% / {((1 - field.value) * 100).toFixed(0)}%</span>
                                            </div>
                                            <Slider
                                                min={0} max={1} step={0.05}
                                                value={[field.value]}
                                                onValueChange={(v: number[]) => {
                                                    field.onChange(v[0]);
                                                    form.setValue('retrieval.hybrid.sparse_weight', parseFloat((1 - v[0]).toFixed(2)));
                                                }}
                                                className="py-2"
                                            />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="retrieval.hybrid.fusion_strategy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelClass}>Fusion Strategy</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="weighted_sum">Weighted Sum</SelectItem>
                                                    <SelectItem value="rrf">RRF</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Re-ranking */}
            <div className={cn(sectionClass, !showRerank && "opacity-80 transition-opacity grayscale-[30%]")}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <RotateCcw size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Re-ranking</h3>
                        </div>
                    </div>
                    <FormField
                        control={form.control}
                        name="retrieval.rerank.enabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </div>

                {showRerank && (
                    <div className={cn(subSectionClass, "bg-indigo-500/5")}>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Provider</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cohere">Cohere</SelectItem>
                                                <SelectItem value="openai">OpenAI</SelectItem>
                                                <SelectItem value="local">Local</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.top_n"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Top N Out</FormLabel>
                                        <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.rerank_batch_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Batch Size</FormLabel>
                                        <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.rerank_threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Threshold</FormLabel>
                                        <Input type="number" step="0.05" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Graph Retrieval */}
            <div className={cn(sectionClass, !showGraph && "opacity-80 grayscale-[30%]")}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Network size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Graph Retrieval</h3>
                        </div>
                    </div>
                    <FormField
                        control={form.control}
                        name="retrieval.graph.enabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </div>

                {showGraph && (
                    <div className={subSectionClass}>
                        <FormField
                            control={form.control}
                            name="retrieval.graph.graph_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelClass}>Graph Schema</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="knowledge">Knowledge Graph</SelectItem>
                                            <SelectItem value="document_relationship">Doc Relationships</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="retrieval.graph.max_hops"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Max Hops</FormLabel>
                                        <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.graph.graph_confidence_threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelClass}>Confidence</FormLabel>
                                        <Input type="number" step="0.05" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.graph.node_score_decay"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between text-[10px] mb-2 font-bold tracking-tight">
                                        <FormLabel className="text-muted-foreground uppercase">Entity Score Decay</FormLabel>
                                        <span className="text-indigo-500 font-mono">{field.value}</span>
                                    </div>
                                    <Slider
                                        min={0} max={1} step={0.05}
                                        value={[field.value]}
                                        onValueChange={(v: number[]) => field.onChange(v[0])}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="retrieval.graph.merge_graph_with_vector"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs font-bold">Merge with Vector</FormLabel>
                                        <p className="text-[9px] text-muted-foreground">Hybrid graph-dense reasoning</p>
                                    </div>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
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

                <div className="grid grid-cols-2 gap-4 px-2">
                    <FormField
                        control={form.control}
                        name="retrieval.advanced.query_embedding_batch_size"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Batch Size</FormLabel>
                                <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="retrieval.advanced.max_query_tokens"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Max Query Tokens</FormLabel>
                                <Input type="number" {...field} className="h-9 rounded-xl bg-background border-border text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="retrieval.advanced.pm125_mode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>PM125 Mode</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-9 rounded-xl bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="off">Off</SelectItem>
                                        <SelectItem value="strict">Strict</SelectItem>
                                        <SelectItem value="relaxed">Relaxed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="retrieval.advanced.enable_query_expansion"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border mt-3">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-bold">Query Expansion</FormLabel>
                                    <p className="text-[9px] text-muted-foreground">Self-query rewriting</p>
                                </div>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
