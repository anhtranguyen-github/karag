import { z } from 'zod';

export const WorkspaceSchema = z.object({
    id: z.string(), // Backend uuid prefix might be <8 chars, let's relax length
    name: z.string().min(1, 'Name is required'),
    description: z.string().nullable().optional(), // Backend sends null if None
    stats: z.object({
        thread_count: z.number().optional(),
        doc_count: z.number().optional(),
    }).optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export const CreateWorkspaceSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(50, 'Name must be 50 characters or less')
        .regex(/^[\w\s.-]+$/, 'Name can only contain letters, numbers, spaces, dots, and hyphens'),
    description: z.string().max(200, 'Description must be 200 characters or less').optional(),

    // Node 1: Embedding
    embedding_provider: z.string().default('openai'),
    embedding_model: z.string().default('text-embedding-3-small'),
    embedding_dim: z.number().int().default(1536),

    // Node 2: Retrieval
    rag_engine: z.enum(['basic', 'graph']).default('basic'),
    search_limit: z.number().int().min(1).max(50).default(5),
    recall_k: z.number().int().min(1).max(100).default(20),
    hybrid_alpha: z.number().min(0).max(1).default(0.5),

    // Node 3: Graph
    graph_enabled: z.boolean().default(true),

    // Node 4: Reranking
    reranker_enabled: z.boolean().default(false),
    reranker_provider: z.string().default('none'),
    rerank_top_k: z.number().int().min(1).max(15).default(3),

    // Node 5: Agentic
    agentic_enabled: z.boolean().default(true),

    // Node 6: Generation
    llm_provider: z.string().default('openai'),
    llm_model: z.string().default('gpt-4o'),
    temperature: z.number().min(0).max(2).default(0.7),

    // Node 7: Ingestion
    chunk_size: z.number().int().min(100).max(4000).default(800),
    chunk_overlap: z.number().int().min(0).max(1000).default(150),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
