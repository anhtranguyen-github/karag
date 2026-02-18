import { z } from 'zod';

export const RecursiveChunkingSchema = z.object({
    strategy: z.literal('recursive'),
    max_chunk_size: z.number().int().min(100).max(4000).default(800),
    min_chunk_size: z.number().int().min(10).max(500).default(100),
    overlap: z.number().int().min(0).max(1000).default(150),
    separators: z.array(z.string()).default(['\n\n', '\n', '. ', ' ']),
    keep_separator: z.boolean().default(true),
});

export const SentenceChunkingSchema = z.object({
    strategy: z.literal('sentence'),
    max_sentences_per_chunk: z.number().int().min(1).max(50).default(5),
    min_sentences_per_chunk: z.number().int().min(1).max(10).default(1),
    sentence_overlap: z.number().int().min(0).max(10).default(1),
    language: z.string().default('en'),
    respect_paragraphs: z.boolean().default(true),
});

export const TokenChunkingSchema = z.object({
    strategy: z.literal('token'),
    max_tokens: z.number().int().min(64).max(4096).default(512),
    token_overlap: z.number().int().min(0).max(500).default(50),
    tokenizer: z.enum(['tiktoken', 'sentencepiece', 'hf']).default('tiktoken'),
    truncate_long_tokens: z.boolean().default(false),
    count_special_tokens: z.boolean().default(false),
});

export const SemanticChunkingSchema = z.object({
    strategy: z.literal('semantic'),
    embedding_model: z.string().default('text-embedding-3-small'),
    similarity_threshold: z.number().min(0).max(1).default(0.3),
    max_chunk_tokens: z.number().int().min(100).max(8192).default(1024),
    min_chunk_tokens: z.number().int().min(10).max(1000).default(100),
    merge_small_chunks: z.boolean().default(true),
});

export const FixedLengthChunkingSchema = z.object({
    strategy: z.literal('fixed'),
    chunk_size: z.number().int().min(100).max(10000).default(1000),
    overlap: z.number().int().min(0).max(2000).default(200),
});

export const DocumentStructureChunkingSchema = z.object({
    strategy: z.literal('document'),
    split_by: z.enum(['heading', 'section', 'page']).default('heading'),
    max_section_length: z.number().int().min(500).max(10000).default(2000),
    fallback_strategy: z.enum(['recursive', 'fixed']).default('recursive'),
    preserve_metadata: z.boolean().default(true),
});

export const ChunkingConfigSchema = z.discriminatedUnion('strategy', [
    RecursiveChunkingSchema,
    SentenceChunkingSchema,
    TokenChunkingSchema,
    SemanticChunkingSchema,
    FixedLengthChunkingSchema,
    DocumentStructureChunkingSchema,
]);

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export type RecursiveChunkingConfig = z.infer<typeof RecursiveChunkingSchema>;
export type SentenceChunkingConfig = z.infer<typeof SentenceChunkingSchema>;
export type TokenChunkingConfig = z.infer<typeof TokenChunkingSchema>;
export type SemanticChunkingConfig = z.infer<typeof SemanticChunkingSchema>;
export type FixedLengthChunkingConfig = z.infer<typeof FixedLengthChunkingSchema>;
export type DocumentStructureChunkingConfig = z.infer<typeof DocumentStructureChunkingSchema>;
