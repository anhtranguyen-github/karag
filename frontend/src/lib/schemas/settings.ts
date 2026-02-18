import { z } from 'zod';

export const AppSettingsSchema = z.object({
    llm_provider: z.string().min(1, "LLM Provider is required"),
    llm_model: z.string().min(1, "LLM Model is required"),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().int().min(1).max(8192).default(2048),
    embedding_provider: z.string().min(1, "Embedding Provider is required"),
    embedding_model: z.string().min(1, "Embedding Model is required"),
    search_limit: z.number().int().min(1).max(50),
    hybrid_alpha: z.number().min(0).max(1),
    reranker_enabled: z.boolean().default(false),
    agentic_enabled: z.boolean().default(true),
    rag_engine: z.enum(["basic", "graph"]).default("basic"),
    graph_enabled: z.boolean().default(true),
    theme: z.string().optional(),
    show_reasoning: z.boolean().default(true),
    job_concurrency: z.number().int().min(1).max(10).default(3),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;
