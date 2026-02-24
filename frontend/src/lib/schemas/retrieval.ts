import { z } from 'zod';

export const VectorSearchSchema = z.object({
    enabled: z.boolean().default(true),
    embedding_model_ref: z.string().nullable().optional(),
    top_k: z.number().int().min(1).max(100).default(5),
    similarity_metric: z.enum(['cosine', 'dot', 'l2']).default('cosine'),
    score_threshold: z.number().min(0.0).max(1.0).nullable().optional(),
    enable_score_normalization: z.boolean().default(true),
});

export const SparseRetrievalSchema = z.object({
    enabled: z.boolean().default(false),
    bm25_k1: z.number().min(0.0).max(5.0).default(1.5),
    bm25_b: z.number().min(0.0).max(1.0).default(0.75),
    top_k: z.number().int().min(1).max(100).default(5),
    min_term_match: z.number().int().min(1).max(10).default(1),
});

export const HybridRetrievalSchema = z.object({
    enabled: z.boolean().default(false),
    dense_weight: z.number().min(0.0).max(1.0).default(0.5),
    sparse_weight: z.number().min(0.0).max(1.0).default(0.5),
    fusion_strategy: z.enum(['rrf', 'weighted_sum']).default('weighted_sum'),
    normalize_scores: z.boolean().default(true),
});

export const RerankSchema = z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['cohere', 'openai', 'local']).default('local'),
    model: z.string().default('bge-reranker-large'),
    top_n: z.number().int().min(1).max(50).default(3),
    rerank_batch_size: z.number().int().min(1).max(128).default(16),
    rerank_threshold: z.number().min(0.0).max(1.0).default(0.0),
    score_normalization: z.boolean().default(true),
});

export const GraphRetrievalSchema = z.object({
    enabled: z.boolean().default(false),
    graph_type: z.enum(['knowledge', 'document_relationship']).default('knowledge'),
    max_hops: z.number().int().min(1).max(5).default(2),
    edge_types: z.array(z.string()).default([]),
    node_score_decay: z.number().min(0.0).max(1.0).default(0.5),
    merge_graph_with_vector: z.boolean().default(true),
    graph_confidence_threshold: z.number().min(0.0).max(1.0).default(0.3),
});

export const AdvancedQuerySchema = z.object({
    query_embedding_batch_size: z.number().int().min(1).max(32).default(1),
    max_query_tokens: z.number().int().min(64).max(2048).default(512),
    enable_query_expansion: z.boolean().default(false),
    pm125_mode: z.enum(['off', 'strict', 'relaxed']).default('off'),
});

export const RetrievalConfigSchema = z.object({
    vector: VectorSearchSchema.default({
        enabled: true,
        top_k: 5,
        similarity_metric: 'cosine',
        enable_score_normalization: true
    }),
    sparse: SparseRetrievalSchema.default({
        enabled: false,
        bm25_k1: 1.5,
        bm25_b: 0.75,
        top_k: 5,
        min_term_match: 1
    }),
    hybrid: HybridRetrievalSchema.default({
        enabled: false,
        dense_weight: 0.5,
        sparse_weight: 0.5,
        fusion_strategy: 'weighted_sum',
        normalize_scores: true
    }),
    rerank: RerankSchema.default({
        enabled: false,
        provider: 'local',
        model: 'bge-reranker-large',
        top_n: 3,
        rerank_batch_size: 16,
        rerank_threshold: 0.0,
        score_normalization: true
    }),
    graph: GraphRetrievalSchema.default({
        enabled: false,
        graph_type: 'knowledge',
        max_hops: 2,
        edge_types: [],
        node_score_decay: 0.5,
        merge_graph_with_vector: true,
        graph_confidence_threshold: 0.3
    }),
    advanced: AdvancedQuerySchema.default({
        query_embedding_batch_size: 1,
        max_query_tokens: 512,
        enable_query_expansion: false,
        pm125_mode: 'off'
    }),
});

export type RetrievalConfig = z.infer<typeof RetrievalConfigSchema>;
