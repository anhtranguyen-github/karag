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
    embedding_dim: z.number().int().default(1536), // OpenAI Default
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
