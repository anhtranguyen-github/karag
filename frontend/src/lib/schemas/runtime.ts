import { z } from 'zod';

export const FastModeConfigSchema = z.object({
    max_loops: z.number().int().min(1).default(1),
    enable_reflection: z.boolean().default(false),
    timeout_ms: z.number().int().min(1000).default(30000),
});

export const ThinkingModeConfigSchema = z.object({
    max_loops: z.number().int().min(1).default(3),
    reflection_depth: z.number().int().min(1).default(2),
    confidence_threshold: z.number().min(0).max(1).default(0.8),
    timeout_ms: z.number().int().min(1000).default(60000),
});

export const DeepThinkingModeConfigSchema = z.object({
    max_loops: z.number().int().min(1).default(5),
    multi_query_limit: z.number().int().min(1).default(3),
    backtracking_enabled: z.boolean().default(true),
    timeout_ms: z.number().int().min(1000).default(120000),
});

export const BlendingModeConfigSchema = z.object({
    query_variants: z.number().int().min(1).default(2),
    answer_variants: z.number().int().min(1).default(2),
    synthesis_strategy: z.enum(['most_complete', 'consensus', 'concatenation']).default('most_complete'),
    timeout_ms: z.number().int().min(1000).default(90000),
});

export const TracingConfigSchema = z.object({
    tracing_enabled: z.boolean().default(true),
    trace_level: z.enum(['basic', 'detailed', 'debug']).default('detailed'),
    store_intermediate_results: z.boolean().default(true),
    explainability_mode: z.boolean().default(true),
    debug_node_outputs: z.boolean().default(false),
});

export const RuntimeSettingsSchema = z.object({
    mode: z.enum(['fast', 'thinking', 'deep', 'blending']).default('fast'),
    fast: FastModeConfigSchema.default({}),
    thinking: ThinkingModeConfigSchema.default({}),
    deep: DeepThinkingModeConfigSchema.default({}),
    blending: BlendingModeConfigSchema.default({}),
    tracing: TracingConfigSchema.default({}),
    stream_thoughts: z.boolean().default(true),
});

export type RuntimeSettings = z.infer<typeof RuntimeSettingsSchema>;
