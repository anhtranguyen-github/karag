import { z } from 'zod';

export const AppSettingsSchema = z.object({
    llm_provider: z.string(),
    llm_model: z.string(),
    embedding_provider: z.string(),
    embedding_model: z.string(),
    search_limit: z.number().int().positive(),
    hybrid_alpha: z.number().min(0).max(1),
    theme: z.string().optional(),
    show_reasoning: z.boolean().default(true),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;
