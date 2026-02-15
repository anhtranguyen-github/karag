import { z } from 'zod';

export const AppSettingsSchema = z.object({
    llm_provider: z.string().min(1, "LLM Provider is required"),
    llm_model: z.string().min(1, "LLM Model is required"),
    embedding_provider: z.string().min(1, "Embedding Provider is required"),
    embedding_model: z.string().min(1, "Embedding Model is required"),
    search_limit: z.number().int().min(1).max(50),
    hybrid_alpha: z.number().min(0).max(1),
    theme: z.string().optional(),
    show_reasoning: z.boolean().default(true),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;
