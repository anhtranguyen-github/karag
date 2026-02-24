export type FieldType = 'text' | 'number' | 'switch' | 'slider' | 'select';

export interface FieldOption {
    label: string;
    value: string | number | boolean;
}

export interface FieldConfig {
    name: string;
    label: string;
    type: FieldType;
    description?: string;
    defaultValue?: any;

    // Limits
    min?: number;
    max?: number;
    step?: number;

    // Options
    options?: FieldOption[];

    // Layout
    colSpan?: 1 | 2;

    // Simple conditional rendering
    dependsOn?: {
        field: string;
        value: any;
    };
}

// ----------------------------------------------------
// CHUNKING SCHEMAS
// ----------------------------------------------------
export const CHUNKING_SCHEMAS: Record<string, FieldConfig[]> = {
    recursive: [
        { name: 'chunking.max_chunk_size', label: 'Max Chunk Size', type: 'number', min: 10, max: 4000, defaultValue: 1000 },
        { name: 'chunking.min_chunk_size', label: 'Min Chunk Size', type: 'number', min: 5, max: 500, defaultValue: 100 },
        { name: 'chunking.chunk_overlap', label: 'Chunk Overlap', type: 'number', min: 0, max: 1000, defaultValue: 200 },
        { name: 'chunking.keep_separator', label: 'Keep Separator', type: 'switch', colSpan: 2, defaultValue: true },
        { name: 'chunking.trim_whitespace', label: 'Trim Whitespace', type: 'switch', colSpan: 2, defaultValue: true },
    ],
    sentence: [
        { name: 'chunking.max_sentences_per_chunk', label: 'Max Sentences', type: 'number', min: 1, max: 50, defaultValue: 5 },
        { name: 'chunking.min_sentences_per_chunk', label: 'Min Sentences', type: 'number', min: 1, max: 10, defaultValue: 1 },
        { name: 'chunking.sentence_overlap', label: 'Sentence Overlap', type: 'number', min: 0, max: 10, defaultValue: 0 },
        {
            name: 'chunking.language', label: 'Language', type: 'select',
            options: [
                { label: 'English', value: 'en' },
                { label: 'Vietnamese', value: 'vi' },
            ],
            defaultValue: 'en'
        },
        { name: 'chunking.respect_paragraphs', label: 'Respect Paragraphs', type: 'switch', colSpan: 2, defaultValue: true },
    ],
    token: [
        { name: 'chunking.max_tokens', label: 'Max Tokens', type: 'number', min: 2, max: 4096, defaultValue: 512 },
        { name: 'chunking.token_overlap', label: 'Token Overlap', type: 'number', min: 0, max: 500, defaultValue: 50 },
        {
            name: 'chunking.tokenizer_type', label: 'Tokenizer', type: 'select',
            options: [
                { label: 'Tiktoken', value: 'tiktoken' },
                { label: 'HuggingFace', value: 'hf' },
            ],
            defaultValue: 'tiktoken'
        },
    ],
    semantic: [
        { name: 'chunking.similarity_threshold', label: 'Similarity Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, defaultValue: 0.3 },
        { name: 'chunking.max_chunk_tokens', label: 'Max Tokens', type: 'number', min: 100, max: 8192, defaultValue: 1024 },
        { name: 'chunking.min_chunk_tokens', label: 'Min Tokens', type: 'number', min: 10, max: 1000, defaultValue: 100 },
        { name: 'chunking.semantic_window_size', label: 'Window Size', type: 'number', min: 1, max: 10, defaultValue: 3 },
        { name: 'chunking.merge_small_chunks', label: 'Merge Small Chunks', type: 'switch', colSpan: 2, defaultValue: true },
    ],
    fixed: [
        { name: 'chunking.chunk_size', label: 'Chunk Size (Chars)', type: 'number', min: 1, max: 10000, defaultValue: 1000 },
        { name: 'chunking.chunk_overlap', label: 'Overlap (Chars)', type: 'number', min: 0, max: 2000, defaultValue: 200 },
        { name: 'chunking.hard_cut', label: 'Hard Cut', type: 'switch', colSpan: 2, defaultValue: false },
    ]
};

// ----------------------------------------------------
// EMBEDDING SCHEMAS
// ----------------------------------------------------
export const EMBEDDING_SCHEMAS: Record<string, FieldConfig[]> = {
    dense_common: [
        { name: 'embedding.dense.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512, defaultValue: 32 },
    ],
    openai: [
        { name: 'embedding.dense.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512, defaultValue: 100 },
        { name: 'embedding.dense.timeout_ms', label: 'Timeout (ms)', type: 'number', min: 1000, max: 120000, defaultValue: 30000 },
    ],
    huggingface: [
        { name: 'embedding.dense.max_sequence_length', label: 'Max Seq Length', type: 'number', min: 1, max: 2048, defaultValue: 512 },
        { name: 'embedding.dense.normalize_embeddings', label: 'Normalize Embeddings', type: 'switch', colSpan: 2, defaultValue: true },
    ],
    sparse: [
        {
            name: 'embedding.sparse.method', label: 'Sparse Strategy', type: 'select',
            options: [
                { label: 'BM25 (Statistical)', value: 'bm25' },
                { label: 'SPLADE (Neural)', value: 'splade' },
                { label: 'ELSER (Elastic)', value: 'elser' },
            ],
            defaultValue: 'bm25',
            colSpan: 2
        },
        {
            name: 'embedding.sparse.language', label: 'Language', type: 'select',
            options: [
                { label: 'English', value: 'en' },
                { label: 'Vietnamese', value: 'vi' },
                { label: 'Multilingual', value: 'multilingual' },
            ],
            defaultValue: 'en'
        },
        { name: 'embedding.sparse.on_the_fly', label: 'On-the-fly Computation', type: 'switch', description: 'Skip pre-indexing for speed', defaultValue: true }
    ]
};

// ----------------------------------------------------
// RETRIEVAL SCHEMAS
// ----------------------------------------------------
export const RETRIEVAL_SCHEMAS: Record<string, FieldConfig[]> = {
    vector: [
        { name: 'retrieval.vector.enabled', label: 'Vector Search', type: 'switch', colSpan: 2, defaultValue: true },
        {
            name: 'retrieval.vector.similarity_metric', label: 'Metric', type: 'select',
            options: [{ label: 'Cosine', value: 'cosine' }, { label: 'Dot', value: 'dot' }, { label: 'L2', value: 'l2' }],
            dependsOn: { field: 'retrieval.vector.enabled', value: true },
            defaultValue: 'cosine'
        },
        { name: 'retrieval.vector.top_k', label: 'Top-K', type: 'slider', min: 1, max: 100, step: 1, colSpan: 2, dependsOn: { field: 'retrieval.vector.enabled', value: true }, defaultValue: 5 },
        { name: 'retrieval.vector.score_threshold', label: 'Score Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.vector.enabled', value: true } },
    ],
    sparse: [
        { name: 'retrieval.sparse.enabled', label: 'Sparse Vector Search', type: 'switch', colSpan: 2, defaultValue: false },
        { name: 'retrieval.sparse.top_k', label: 'Top-K', type: 'number', min: 1, max: 100, dependsOn: { field: 'retrieval.sparse.enabled', value: true }, defaultValue: 5 },
    ],
    hybrid: [
        { name: 'retrieval.hybrid.enabled', label: 'Hybrid Fusion', type: 'switch', colSpan: 2, defaultValue: false },
        { name: 'retrieval.hybrid.dense_weight', label: 'Dense Weight', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.hybrid.enabled', value: true }, defaultValue: 0.5 },
        { name: 'retrieval.hybrid.sparse_weight', label: 'Sparse Weight', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.hybrid.enabled', value: true }, defaultValue: 0.5 },
        {
            name: 'retrieval.hybrid.fusion_strategy', label: 'Fusion Strategy', type: 'select',
            options: [{ label: 'Weighted Sum', value: 'weighted_sum' }, { label: 'RRF', value: 'rrf' }],
            dependsOn: { field: 'retrieval.hybrid.enabled', value: true },
            defaultValue: 'weighted_sum'
        },
    ],
    rerank: [
        { name: 'retrieval.rerank.enabled', label: 'Cross-Encoder Reranking', type: 'switch', colSpan: 2, defaultValue: false },
        {
            name: 'retrieval.rerank.provider', label: 'Provider', type: 'select',
            options: [{ label: 'Cohere', value: 'cohere' }, { label: 'Local', value: 'local' }],
            dependsOn: { field: 'retrieval.rerank.enabled', value: true },
            defaultValue: 'local'
        },
        { name: 'retrieval.rerank.top_n', label: 'Top-N Final', type: 'number', min: 1, max: 50, dependsOn: { field: 'retrieval.rerank.enabled', value: true }, defaultValue: 3 },
    ],
    graph: [
        { name: 'retrieval.graph.enabled', label: 'Knowledge Graph Retrieval', type: 'switch', colSpan: 2, defaultValue: false },
        { name: 'retrieval.graph.max_hops', label: 'Max Hops', type: 'number', min: 1, max: 5, dependsOn: { field: 'retrieval.graph.enabled', value: true }, defaultValue: 2 },
    ],
    advanced: [
        { name: 'retrieval.advanced.query_embedding_batch_size', label: 'Query Batch Size', type: 'number', min: 1, max: 32, defaultValue: 1 },
        { name: 'retrieval.advanced.max_query_tokens', label: 'Max Query Tokens', type: 'number', min: 64, max: 2048, defaultValue: 512 },
        { name: 'retrieval.advanced.enable_query_expansion', label: 'Query Expansion', type: 'switch', colSpan: 1, defaultValue: false },
        {
            name: 'retrieval.advanced.pm125_mode', label: 'PM125 Mode', type: 'select',
            options: [
                { label: 'Off', value: 'off' },
                { label: 'Strict', value: 'strict' },
                { label: 'Relaxed', value: 'relaxed' },
            ],
            defaultValue: 'off',
            colSpan: 1
        },
    ]
};

// ----------------------------------------------------
// GENERATION SCHEMAS
// ----------------------------------------------------
export const GENERATION_SCHEMAS: Record<string, FieldConfig[]> = {
    common: [
        { name: 'generation.temperature', label: 'Temperature', type: 'slider', min: 0.0, max: 2.0, step: 0.05, colSpan: 2, defaultValue: 0.7 },
        { name: 'generation.max_output_tokens', label: 'Max Generation Tokens', type: 'number', min: 1, max: 128000, defaultValue: 2048 },
        { name: 'generation.streaming', label: 'Enable Streaming UI', type: 'switch', colSpan: 2, defaultValue: true }
    ],
    openai: [
        { name: 'generation.presence_penalty', label: 'Presence Penalty', type: 'slider', min: -2.0, max: 2.0, step: 0.1, colSpan: 2, defaultValue: 0.0 },
    ],
};

// ----------------------------------------------------
// RUNTIME SCHEMAS
// ----------------------------------------------------
export const RUNTIME_SCHEMAS: Record<string, FieldConfig[]> = {
    think: [
        { name: 'runtime.think.max_loops', label: 'Max Loops', type: 'slider', min: 1, max: 10, step: 1, colSpan: 2, defaultValue: 3 },
        { name: 'runtime.think.reflection_depth', label: 'Reflection Depth', type: 'slider', min: 1, max: 5, step: 1, colSpan: 2, defaultValue: 2 },
    ],
    common: [
        { name: 'runtime.stream_thoughts', label: 'Stream Thoughts', type: 'switch', description: 'See internal reasoning LIVE', colSpan: 1, defaultValue: true },
        {
            name: 'runtime.tracing.trace_level', label: 'Tracing Level', type: 'select',
            options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Detailed', value: 'detailed' },
            ],
            defaultValue: 'detailed',
            colSpan: 1
        },
    ]
};
