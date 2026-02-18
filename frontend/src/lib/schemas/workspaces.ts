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
        chunk_overlap: 200,
    }),

    // Embedding Component
    embedding: EmbeddingConfigSchema.default({
        provider: 'openai',
        model: 'text-embedding-3-small',
        batch_size: 100,
        timeout_ms: 30000
    }),

    // Retrieval Component
    retrieval: RetrievalConfigSchema.default({}),

    // Generation Component
    generation: GenerationConfigSchema.default({
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_output_tokens: 2048,
        streaming: true
    }),

    // Runtime Component (Thinking Mode)
    runtime: RuntimeSettingsSchema.default({}),

    // Legacy/Internal
    system_prompt: z.string().default('You are an advanced reasoning assistant. Use the provided context to answer the user\'s question.'),
});

export const CreateWorkspaceSchema = BaseCreateWorkspaceSchema;

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
