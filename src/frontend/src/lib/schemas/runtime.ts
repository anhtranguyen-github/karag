import { z } from 'zod';

export const AutoModeSchema = z.object({
    max_loops: z.number().int().default(3),
    timeout_ms: z.number().int().min(1000).default(60000),
});

export const FastModeSchema = z.object({
    max_loops: z.number().int().default(1),
    enable_reflection: z.boolean().default(false),
    timeout_ms: z.number().int().min(1000).default(30000),
});

export const ThinkModeSchema = z.object({
    max_loops: z.number().int().min(1).max(10).default(5),
    reflection_depth: z.number().int().min(1).max(5).default(3),
    confidence_threshold: z.number().min(0.0).max(1.0).default(0.7),
    timeout_ms: z.number().int().min(1000).default(90000),
});

export const DeepModeSchema = z.object({
    max_loops: z.number().int().min(1).max(20).default(10),
    multi_query_limit: z.number().int().min(1).max(10).default(5),
    backtracking_enabled: z.boolean().default(true),
    timeout_ms: z.number().int().min(1000).default(180000),
});

export const TracingSchema = z.object({
    tracing_enabled: z.boolean().default(true),
    trace_level: z.enum(['basic', 'detailed', 'debug']).default('detailed'),
    store_intermediate_results: z.boolean().default(true),
    explainability_mode: z.boolean().default(true),
    debug_node_outputs: z.boolean().default(false),
});

export const RuntimeSettingsSchema = z.object({
    mode: z.enum(['auto', 'fast', 'think', 'deep']).default('auto'),
    auto: AutoModeSchema.default({
        max_loops: 3,
        timeout_ms: 60000
    }),
    fast: FastModeSchema.default({
        max_loops: 1,
        enable_reflection: false,
        timeout_ms: 30000
    }),
    think: ThinkModeSchema.default({
        max_loops: 5,
        reflection_depth: 3,
        confidence_threshold: 0.7,
        timeout_ms: 90000
    }),
    deep: DeepModeSchema.default({
        max_loops: 10,
        multi_query_limit: 5,
        backtracking_enabled: true,
        timeout_ms: 180000
    }),
    tracing: TracingSchema.default({
        tracing_enabled: true,
        trace_level: 'detailed',
        store_intermediate_results: true,
        explainability_mode: true,
        debug_node_outputs: false
    }),
    stream_thoughts: z.boolean().default(true),
});

export type RuntimeSettings = z.infer<typeof RuntimeSettingsSchema>;
