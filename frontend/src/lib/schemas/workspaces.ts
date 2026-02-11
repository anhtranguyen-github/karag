import { z } from 'zod';

export const WorkspaceSchema = z.object({
    id: z.string().length(8),
    name: z.string().min(1, 'Name is required'),
    embedding_dim: z.number().int().positive(),
    rag_config_hash: z.string().optional(),
    status: z.enum(['active', 'archived']).default('active'),
    description: z.string().optional(),
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
