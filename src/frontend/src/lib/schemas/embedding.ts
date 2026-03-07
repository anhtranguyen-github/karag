import { z } from 'zod';

export const OpenAIEmbeddingSchema = z.object({
    provider: z.literal('openai'),
    model: z.enum(['text-embedding-3-small', 'text-embedding-3-large']).default('text-embedding-3-small'),
    batch_size: z.number().int().min(1).max(512).default(32),
    timeout_ms: z.number().int().min(1000).max(120000).default(30000),
    retry_limit: z.number().int().min(0).max(10).default(3),
    api_key_ref: z.string().nullable().optional(),
});

export const AzureOpenAIEmbeddingSchema = z.object({
    provider: z.literal('azure'),
    model: z.enum(['text-embedding-ada-002', 'text-embedding-3-large']).default('text-embedding-ada-002'),
    deployment_name: z.string().min(1, 'Deployment name is required'),
    api_version: z.string().default('2023-05-15'),
    batch_size: z.number().int().min(1).max(512).default(32),
    timeout_ms: z.number().int().min(1000).max(120000).default(30000),
});

export const VoyageEmbeddingSchema = z.object({
    provider: z.literal('voyage'),
    model: z.enum(['voyage-large-2', 'voyage-code-2']).default('voyage-large-2'),
    batch_size: z.number().int().min(1).max(512).default(32),
});

export const CohereEmbeddingSchema = z.object({
    provider: z.literal('cohere'),
    model: z.enum(['embed-english-v3.0', 'embed-multilingual-v3.0']).default('embed-english-v3.0'),
    input_type: z.enum(['search_query', 'search_document', 'classification', 'clustering']).default('search_query'),
    truncate: z.enum(['NONE', 'START', 'END']).default('END'),
    batch_size: z.number().int().min(1).max(512).default(32),
});

export const HuggingFaceEmbeddingSchema = z.object({
    provider: z.literal('huggingface'),
    model: z.enum([
        'sentence-transformers/all-MiniLM-L6-v2',
        'bge-base-en-v1.5',
        'bge-large-en-v1.5'
    ]).default('bge-base-en-v1.5'),
    device: z.enum(['cpu', 'cuda', 'mps']).default('cpu'),
    normalize_embeddings: z.boolean().default(true),
    batch_size: z.number().int().min(1).max(512).default(32),
    max_sequence_length: z.number().int().min(1).max(2048).default(512),
});

export const OllamaEmbeddingSchema = z.object({
    provider: z.literal('ollama'),
    model: z.enum(['mxbai-embed-large', 'nomic-embed-text']).default('nomic-embed-text'),
    batch_size: z.number().int().min(1).max(512).default(32),
});

export const LlamaEmbeddingSchema = z.object({
    provider: z.literal('llama'),
    model: z.enum(['llama-embedding-7b', 'llama-embedding-13b']).default('llama-embedding-7b'),
    model_path: z.string().nullable().optional(),
    quantization: z.enum(['fp16', 'int8', 'int4']).default('fp16'),
    device_map: z.string().default('auto'),
    batch_size: z.number().int().min(1).max(512).default(32),
});

export const CDP2EmbeddingSchema = z.object({
    provider: z.literal('cdp2'),
    model: z.enum(['cdp2-embedding-base', 'cdp2-embedding-large']).default('cdp2-embedding-base'),
    checkpoint_path: z.string().nullable().optional(),
    enable_finetune: z.boolean().default(false),
    embedding_cache: z.boolean().default(true),
    batch_size: z.number().int().min(1).max(512).default(32),
});

export const VLMEmbeddingSchema = z.object({
    provider: z.literal('vlm'),
    model: z.enum(['vlm-clip-vit-b32', 'vlm-clip-vit-l14']).default('vlm-clip-vit-b32'),
    input_modalities: z.enum(['text', 'image', 'both']).default('both'),
    image_resolution: z.number().int().min(128).max(1024).default(224),
    batch_size: z.number().int().min(1).max(512).default(32),
    normalize_embeddings: z.boolean().default(true),
});

export const SparseEmbeddingSchema = z.object({
    method: z.enum(['bm25', 'splade', 'elser']).default('bm25'),
    language: z.enum(['en', 'vi', 'multilingual']).default('en'),
    on_the_fly: z.boolean().default(true), // BM25 is usually on-the-fly, Splade needs indexing
});

export const EmbeddingConfigSchema = z.object({
    dense: z.discriminatedUnion('provider', [
        OpenAIEmbeddingSchema,
        AzureOpenAIEmbeddingSchema,
        VoyageEmbeddingSchema,
        CohereEmbeddingSchema,
        HuggingFaceEmbeddingSchema,
        OllamaEmbeddingSchema,
        LlamaEmbeddingSchema,
        CDP2EmbeddingSchema,
        VLMEmbeddingSchema,
    ]),
    sparse: SparseEmbeddingSchema.default({ method: 'bm25', language: 'en', on_the_fly: true }),
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export const MODEL_DIMENSIONS: Record<string, number | number[]> = {
    'text-embedding-3-small': [512, 1024, 1536], // Matryoshka support
    'text-embedding-3-large': [256, 512, 1024, 3072],
    'text-embedding-ada-002': 1536,
    'voyage-large-2': 1536,
    'voyage-code-2': 1536,
    'embed-english-v3.0': 1024,
    'embed-multilingual-v3.0': 1024,
    'sentence-transformers/all-MiniLM-L6-v2': 384,
    'bge-base-en-v1.5': 768,
    'bge-large-en-v1.5': 1024,
    'mxbai-embed-large': 1024,
    'nomic-embed-text': 768,
    'llama-embedding-7b': 4096,
    'llama-embedding-13b': 5120,
    'cdp2-embedding-base': 1024,
    'cdp2-embedding-large': 2048,
    'vlm-clip-vit-b32': 512,
    'vlm-clip-vit-l14': 768,
};
