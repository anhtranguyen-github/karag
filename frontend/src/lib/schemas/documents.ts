import { z } from 'zod';

export const DocumentStatusSchema = z.enum([
    'uploaded',
    'indexing',
    'indexed',
    'failed',
]);

export const DocumentSchema = z.object({
    id: z.string(), // Relaxed length
    filename: z.string(),
    workspace_id: z.string(),
    content_hash: z.string(),
    rag_config_hash: z.string().nullable().optional(),
    status: z.string(), // Relaxed enum for backend variation
    chunks: z.number().int().nullable().optional(),
    shared_with: z.string().array().optional().default([]),
    created_at: z.string(), // Relaxed from strict datetime()
    updated_at: z.string(),
    // Derived frontend fields
    is_shared: z.boolean().optional(),
    workspace_name: z.string().optional(),
});

export const DocumentOpSchema = z.enum(['move', 'link', 'share', 'unshare']);

export const UpdateWorkspacePayloadSchema = z.object({
    name: z.string().min(1),
    target_workspace_id: z.string(), // Relaxed length
    action: DocumentOpSchema,
    force_reindex: z.boolean().default(false),
});

export type Document = z.infer<typeof DocumentSchema>;
export type UpdateWorkspacePayload = z.infer<typeof UpdateWorkspacePayloadSchema>;
