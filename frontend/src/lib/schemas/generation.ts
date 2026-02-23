import { z } from 'zod';

export const BaseGenerationSchema = z.object({
    temperature: z.number().min(0.0).max(2.0).default(0.7),
    top_p: z.number().min(0.0).max(1.0).default(1.0),
    max_output_tokens: z.number().int().min(1).max(128000).default(2048),
    streaming: z.boolean().default(true),
    stop_sequences: z.array(z.string()).default([]),
});

export const OpenAIGenerationSchema = BaseGenerationSchema.extend({
    provider: z.literal('openai'),
    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4.1']).default('gpt-4o-mini'),
    presence_penalty: z.number().min(-2.0).max(2.0).default(0.0),
    frequency_penalty: z.number().min(-2.0).max(2.0).default(0.0),
});

export const AzureOpenAIGenerationSchema = BaseGenerationSchema.extend({
    provider: z.literal('azure'),
    model: z.enum(['gpt-4', 'gpt-4o']).default('gpt-4o'),
    deployment_name: z.string().min(1, 'Deployment name is required'),
    api_version: z.string().default('2024-02-15-preview'),
    presence_penalty: z.number().min(-2.0).max(2.0).default(0.0),
    frequency_penalty: z.number().min(-2.0).max(2.0).default(0.0),
});

export const LlamaGenerationSchema = BaseGenerationSchema.extend({
    provider: z.literal('llama'),
    model: z.enum(['llama-3-8b-instruct', 'llama-3-70b-instruct']).default('llama-3-8b-instruct'),
    top_k: z.number().int().min(1).max(100).default(40),
    repeat_penalty: z.number().min(0.0).max(2.0).default(1.1),
    model_path: z.string().nullable().optional(),
    device: z.enum(['cpu', 'cuda', 'mps']).default('cpu'),
    quantization: z.enum(['fp16', 'int8', 'int4']).default('fp16'),
});

export const CDP2GenerationSchema = BaseGenerationSchema.extend({
    provider: z.literal('cdp2'),
    model: z.enum(['cdp2-llm-base', 'cdp2-llm-large']).default('cdp2-llm-base'),
    top_k: z.number().int().min(1).max(100).default(40),
    repeat_penalty: z.number().min(0.0).max(2.0).default(1.1),
    checkpoint_path: z.string().nullable().optional(),
});

export const VLMGenerationSchema = BaseGenerationSchema.extend({
    provider: z.literal('vlm'),
    model: z.enum(['llava-1.6', 'llava-next', 'gpt-4o']).default('gpt-4o'),
    input_modalities: z.enum(['text', 'image', 'both']).default('both'),
    image_max_resolution: z.number().int().min(256).max(2048).default(1024),
});

export const GenerationConfigSchema = z.discriminatedUnion('provider', [
    OpenAIGenerationSchema,
    AzureOpenAIGenerationSchema,
    LlamaGenerationSchema,
    CDP2GenerationSchema,
    VLMGenerationSchema,
]);

export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
