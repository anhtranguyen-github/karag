import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RotateCcw, Network, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetrievalSettingsProps {
    form: UseFormReturn<any>;
}

export function RetrievalSettings({ form }: RetrievalSettingsProps) {
    const showVector = form.watch('retrieval.vector.enabled');
    const showBM25 = form.watch('retrieval.bm25.enabled');
    const showHybrid = form.watch('retrieval.hybrid.enabled');
    const showRerank = form.watch('retrieval.rerank.enabled');
    const showGraph = form.watch('retrieval.graph.enabled');

    return (
        <div className="space-y-6">
            {/* 1. Vector & Sparse Search Modules */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Base Retrieval (Vector & BM25)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    {/* Dense Vector Toggle */}
                    <div className="flex items-center justify-between border-b pb-3 border-muted/20">
                        <div className="space-y-0.5">
                            <FormLabel className="text-xs">Dense Vector Search</FormLabel>
                            <FormDescription className="text-[10px]">ML-based semantic search</FormDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.vector.enabled"
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                    </div>

                    {showVector && (
                        <div className="grid grid-cols-2 gap-4 px-2">
                            <FormField
                                control={form.control}
                                name="retrieval.vector.top_k"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Vector Top K</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.vector.similarity_metric"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Metric</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                    )}

                    {/* Sparse BM25 Toggle */}
                    <div className="flex items-center justify-between border-b pb-3 border-muted/20">
                        <div className="space-y-0.5">
                            <FormLabel className="text-xs">Sparse BM25 Search</FormLabel>
                            <FormDescription className="text-[10px]">Keyword-based traditional search</FormDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.bm25.enabled"
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                    </div>

                    {showBM25 && (
                        <div className="grid grid-cols-2 gap-4 px-2">
                            <FormField
                                control={form.control}
                                name="retrieval.bm25.top_k"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">BM25 Top K</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.bm25.min_term_match"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Min Match</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Hybrid Fusion Section */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4">
                            <FormLabel className="text-xs font-medium text-emerald-500">Hybrid Fusion</FormLabel>
                            <FormField
                                control={form.control}
                                name="retrieval.hybrid.enabled"
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                            />
                        </div>

                        {showHybrid && (
                            <div className="space-y-4 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                                <FormField
                                    control={form.control}
                                    name="retrieval.hybrid.dense_weight"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <FormLabel>Dense vs Sparse Weight</FormLabel>
                                                <span>{(field.value * 100).toFixed(0)}% / {((1 - field.value) * 100).toFixed(0)}%</span>
                                            </div>
                                            <Slider
                                                min={0} max={1} step={0.05}
                                                value={[field.value]}
                                                onValueChange={(v) => {
                                                    field.onChange(v[0]);
                                                    form.setValue('retrieval.hybrid.sparse_weight', parseFloat((1 - v[0]).toFixed(2)));
                                                }}
                                            />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="retrieval.hybrid.fusion_strategy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px]">Fusion Strategy</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                </CardContent>
            </Card>

            {/* 2. Re-ranking Module */}
            <Card className={cn(!showRerank && "opacity-60")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Re-ranking (Cross-Encoder)</CardTitle>
                    </div>
                    <FormField
                        control={form.control}
                        name="retrieval.rerank.enabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </CardHeader>
                {showRerank && (
                    <CardContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Provider</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                        <FormLabel className="text-[10px]">Top N Out</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.rerank_batch_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Batch Size</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.rerank.rerank_threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Threshold</FormLabel>
                                        <Input type="number" step="0.05" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* 3. Graph Retrieval Module */}
            <Card className={cn(!showGraph && "opacity-60")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Graph Retrieval</CardTitle>
                    </div>
                    <FormField
                        control={form.control}
                        name="retrieval.graph.enabled"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                </CardHeader>
                {showGraph && (
                    <CardContent className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="retrieval.graph.graph_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">Graph Schema</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                        <FormLabel className="text-[10px]">Max Hops</FormLabel>
                                        <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retrieval.graph.graph_confidence_threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px]">Confidence</FormLabel>
                                        <Input type="number" step="0.05" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="retrieval.graph.node_score_decay"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <FormLabel>Entity Score Decay</FormLabel>
                                        <span>{field.value}</span>
                                    </div>
                                    <Slider
                                        min={0} max={1} step={0.05}
                                        value={[field.value]}
                                        onValueChange={(v) => field.onChange(v[0])}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="retrieval.graph.merge_graph_with_vector"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between border rounded-md p-2">
                                    <FormLabel className="text-[10px]">Merge with Vector</FormLabel>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                )}
            </Card>

            {/* 4. Advanced Settings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Advanced Query Parameters</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="retrieval.advanced.query_embedding_batch_size"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">Query Batch Size</FormLabel>
                                    <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="retrieval.advanced.max_query_tokens"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">Max Query Tokens</FormLabel>
                                    <Input type="number" {...field} className="h-8 text-xs" onChange={e => field.onChange(parseInt(e.target.value))} />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="retrieval.advanced.pm125_mode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px]">PM125 Mode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                <FormItem className="flex items-center justify-between border rounded-md p-2">
                                    <FormLabel className="text-[10px]">Query Expansion</FormLabel>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
