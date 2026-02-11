import { z } from 'zod';

export const MessageSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    reasoning_steps: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    sources: z.array(z.object({
        id: z.number(),
        name: z.string(),
        content: z.string(),
    })).optional(),
});

export const ThreadSchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    has_thinking: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    updated_at: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
