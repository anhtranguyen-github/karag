import { z } from 'zod';

export const ToolDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['system', 'custom', 'mcp']),
    enabled: z.boolean(),
    config: z.record(z.unknown()).optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
