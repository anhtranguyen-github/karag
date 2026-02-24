import { z } from 'zod';
import { ChunkingConfigSchema } from './chunking';
import { EmbeddingConfigSchema } from './embedding';
import { GenerationConfigSchema } from './generation';
import { RetrievalConfigSchema } from './retrieval';
import { RuntimeSettingsSchema } from './runtime';

export const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().nullable().optional(),
    stats: z.object({
        thread_count: z.number().optional(),
        doc_count: z.number().optional(),
    }).optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    llm_provider: z.string().optional().nullable(),
    embedding_provider: z.string().optional().nullable(),
    rag_engine: z.string().optional().nullable(),
});

export const BaseCreateWorkspaceSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(50, 'Name must be 50 characters or less')
        .regex(/^[\w\s.-]+$/, 'Name can only contain letters, numbers, spaces, dots, and hyphens'),
    description: z.string().max(200, 'Description must be 200 characters or less').optional(),

    // Ingestion Component
    chunking: ChunkingConfigSchema.default({
        strategy: 'recursive',
        max_chunk_size: 1000,
        min_chunk_size: 100,
        chunk_overlap: 200,
        separators: ['\n\n', '\n', '. ', ' '],
        keep_separator: true,
        trim_whitespace: true,
        fallback_to_sentence: false,
    }),

    // Embedding Component
    embedding: EmbeddingConfigSchema.default({
        dense: {
            provider: 'openai',
            model: 'text-embedding-3-small',
            batch_size: 100,
            timeout_ms: 30000,
            retry_limit: 3
        },
        sparse: {
            method: 'bm25',
            language: 'en',
            on_the_fly: true
        }
    }),

    // Retrieval Component
    retrieval: RetrievalConfigSchema.default({
        vector: {
            enabled: true,
            top_k: 5,
            similarity_metric: 'cosine',
            enable_score_normalization: true
        },
        sparse: {
            enabled: false,
            bm25_k1: 1.5,
            bm25_b: 0.75,
            top_k: 5,
            min_term_match: 1
        },
        hybrid: {
            enabled: false,
            dense_weight: 0.5,
            sparse_weight: 0.5,
            fusion_strategy: 'weighted_sum',
            normalize_scores: true
        },
        rerank: {
            enabled: false,
            provider: 'local',
            model: 'bge-reranker-large',
            top_n: 3,
            rerank_batch_size: 16,
            rerank_threshold: 0.0,
            score_normalization: true
        },
        graph: {
            enabled: false,
            graph_type: 'knowledge',
            max_hops: 2,
            edge_types: [],
            node_score_decay: 0.5,
            merge_graph_with_vector: true,
            graph_confidence_threshold: 0.3
        },
        advanced: {
            query_embedding_batch_size: 1,
            max_query_tokens: 512,
            enable_query_expansion: false,
            pm125_mode: 'off'
        }
    }),

    // Generation Component
    generation: GenerationConfigSchema.default({
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        top_p: 1.0,
        max_output_tokens: 2048,
        streaming: true,
        stop_sequences: [],
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
    }),

    // Runtime Component (Thinking Mode)
    runtime: RuntimeSettingsSchema.default({
        mode: 'auto',
        auto: {
            max_loops: 3,
            timeout_ms: 60000
        },
        fast: {
            max_loops: 1,
            enable_reflection: false,
            timeout_ms: 30000
        },
        think: {
            max_loops: 5,
            reflection_depth: 3,
            confidence_threshold: 0.7,
            timeout_ms: 90000
        },
        deep: {
            max_loops: 10,
            multi_query_limit: 5,
            backtracking_enabled: true,
            timeout_ms: 180000
        },
        tracing: {
            tracing_enabled: true,
            trace_level: 'detailed',
            store_intermediate_results: true,
            explainability_mode: true,
            debug_node_outputs: false
        },
        stream_thoughts: true
    }),

    // Legacy/Internal
    system_prompt: z.string().default('You are an advanced reasoning assistant. Use the provided context to answer the user\'s question.'),
});

export const CreateWorkspaceSchema = BaseCreateWorkspaceSchema;

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
