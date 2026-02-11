import { z } from 'zod';

export const DocumentStatusSchema = z.enum([
    'uploaded',
    'indexing',
    'indexed',
    'failed',
]);

export const DocumentSchema = z.object({
    id: z.string().length(8),
    filename: z.string(),
    workspace_id: z.string(),
    content_hash: z.string(),
    rag_config_hash: z.string().optional(),
    status: DocumentStatusSchema,
    chunks: z.number().int().optional(),
    shared_with: z.string().array().optional().default([]),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    // Derived frontend fields
    is_shared: z.boolean().optional(),
    workspace_name: z.string().optional(),
});

export const DocumentOpSchema = z.enum(['move', 'link', 'share', 'unshare']);

export const UpdateWorkspacePayloadSchema = z.object({
    name: z.string().min(1),
    target_workspace_id: z.string().length(8),
    action: DocumentOpSchema,
    force_reindex: z.boolean().default(false),
});

export type Document = z.infer<typeof DocumentSchema>;
export type UpdateWorkspacePayload = z.infer<typeof UpdateWorkspacePayloadSchema>;
