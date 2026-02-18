import { z } from 'zod';

export const VectorSearchSchema = z.object({
    enabled: z.boolean().default(true),
    top_k: z.number().int().min(1).max(100).default(5),
    similarity_metric: z.enum(['cosine', 'dot', 'l2']).default('cosine'),
    score_threshold: z.number().min(0).max(1).optional(),
    enable_sparse: z.boolean().default(false),
    bm25_k1: z.number().min(0).max(5).default(1.5),
    bm25_b: z.number().min(0).max(1).default(0.75),

    enable_hybrid: z.boolean().default(false),
    dense_weight: z.number().min(0).max(1).default(0.5),
    sparse_weight: z.number().min(0).max(1).default(0.5),
    fusion_strategy: z.enum(['rrf', 'weighted_sum']).default('weighted_sum'),
});

export const RerankSchema = z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['cohere', 'openai', 'local']).default('local'),
    model: z.string().default('bge-reranker-large'),
    top_n: z.number().int().min(1).max(50).default(3),
    rerank_threshold: z.number().min(0).max(1).default(0.0),
});

export const GraphRetrievalSchema = z.object({
    enabled: z.boolean().default(false),
    graph_type: z.enum(['knowledge', 'document_relationship']).default('knowledge'),
    max_hops: z.number().int().min(1).max(5).default(2),
    node_score_decay: z.number().min(0).max(1).default(0.5),
    merge_with_vector: z.boolean().default(true),
});

export const AdvancedQuerySchema = z.object({
    query_expansion: z.boolean().default(false),
    max_query_tokens: z.number().int().min(64).max(2048).default(512),
    pm125_mode: z.enum(['off', 'strict', 'relaxed']).default('off'),
});

export const RetrievalConfigSchema = z.object({
    vector: VectorSearchSchema.default({}),
    rerank: RerankSchema.default({}),
    graph: GraphRetrievalSchema.default({}),
    advanced: AdvancedQuerySchema.default({}),
});

export type RetrievalConfig = z.infer<typeof RetrievalConfigSchema>;
