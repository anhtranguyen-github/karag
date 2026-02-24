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
        { name: 'chunking.max_chunk_size', label: 'Max Chunk Size', type: 'number', min: 10, max: 4000 },
        { name: 'chunking.min_chunk_size', label: 'Min Chunk Size', type: 'number', min: 5, max: 500 },
        { name: 'chunking.chunk_overlap', label: 'Chunk Overlap', type: 'number', min: 0, max: 1000 },
        { name: 'chunking.keep_separator', label: 'Keep Separator', type: 'switch', colSpan: 2 },
        { name: 'chunking.trim_whitespace', label: 'Trim Whitespace', type: 'switch', colSpan: 2 },
        { name: 'chunking.fallback_to_sentence', label: 'Fallback to Sentence', type: 'switch', colSpan: 2 },
    ],
    sentence: [
        { name: 'chunking.max_sentences_per_chunk', label: 'Max Sentences', type: 'number', min: 1, max: 50 },
        { name: 'chunking.min_sentences_per_chunk', label: 'Min Sentences', type: 'number', min: 1, max: 10 },
        { name: 'chunking.sentence_overlap', label: 'Sentence Overlap', type: 'number', min: 0, max: 10 },
        {
            name: 'chunking.language', label: 'Language', type: 'select',
            options: [
                { label: 'English', value: 'en' },
                { label: 'Vietnamese', value: 'vi' },
                { label: 'French', value: 'fr' },
                { label: 'German', value: 'de' },
                { label: 'Spanish', value: 'es' },
            ]
        },
        { name: 'chunking.respect_paragraphs', label: 'Respect Paragraphs', type: 'switch', colSpan: 2 },
        { name: 'chunking.merge_short_sentences', label: 'Merge Short Sentences', type: 'switch', colSpan: 2 },
    ],
    token: [
        { name: 'chunking.max_tokens', label: 'Max Tokens', type: 'number', min: 2, max: 4096 },
        { name: 'chunking.token_overlap', label: 'Token Overlap', type: 'number', min: 0, max: 500 },
        {
            name: 'chunking.tokenizer_type', label: 'Tokenizer', type: 'select',
            options: [
                { label: 'Tiktoken', value: 'tiktoken' },
                { label: 'SentencePiece', value: 'sentencepiece' },
                { label: 'HuggingFace', value: 'hf' },
            ]
        },
        { name: 'chunking.count_special_tokens', label: 'Count Special Tokens', type: 'switch', colSpan: 2 },
        { name: 'chunking.truncate_overflow', label: 'Truncate Overflow', type: 'switch', colSpan: 2 },
        { name: 'chunking.strict_token_limit', label: 'Strict Token Limit', type: 'switch', colSpan: 2 },
    ],
    semantic: [
        { name: 'chunking.similarity_threshold', label: 'Similarity Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2 },
        { name: 'chunking.max_chunk_tokens', label: 'Max Tokens', type: 'number', min: 100, max: 8192 },
        { name: 'chunking.min_chunk_tokens', label: 'Min Tokens', type: 'number', min: 10, max: 1000 },
        { name: 'chunking.semantic_window_size', label: 'Window Size', type: 'number', min: 1, max: 10 },
        { name: 'chunking.merge_small_chunks', label: 'Merge Small Chunks', type: 'switch', colSpan: 2 },
    ],
    fixed: [
        { name: 'chunking.chunk_size', label: 'Chunk Size (Chars)', type: 'number', min: 1, max: 10000 },
        { name: 'chunking.chunk_overlap', label: 'Overlap (Chars)', type: 'number', min: 0, max: 2000 },
        { name: 'chunking.hard_cut', label: 'Hard Cut', type: 'switch', colSpan: 2 },
        { name: 'chunking.pad_last_chunk', label: 'Pad Last Chunk', type: 'switch', colSpan: 2 },
    ],
    document: [
        {
            name: 'chunking.split_by', label: 'Split By', type: 'select',
            options: [
                { label: 'Heading', value: 'heading' },
                { label: 'Section', value: 'section' },
                { label: 'Page', value: 'page' },
            ]
        },
        { name: 'chunking.max_section_length', label: 'Max Section Length', type: 'number', min: 500, max: 10000 },
        {
            name: 'chunking.fallback_strategy', label: 'Fallback Strategy', type: 'select',
            options: [
                { label: 'Recursive', value: 'recursive' },
                { label: 'Fixed', value: 'fixed' },
            ]
        },
        { name: 'chunking.preserve_hierarchy', label: 'Preserve Hierarchy', type: 'switch', colSpan: 2 },
        { name: 'chunking.include_metadata', label: 'Include Metadata', type: 'switch', colSpan: 2 },
    ]
};

// ----------------------------------------------------
// EMBEDDING SCHEMAS
// ----------------------------------------------------
export const EMBEDDING_SCHEMAS: Record<string, FieldConfig[]> = {
    openai: [
        { name: 'embedding.api_key_ref', label: 'API Key Ref (Optional)', type: 'text', description: 'Reference ID in secret manager', colSpan: 2 },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
        { name: 'embedding.retry_limit', label: 'Retry Limit', type: 'number', min: 0, max: 10 },
        { name: 'embedding.timeout_ms', label: 'Timeout (ms)', type: 'number', min: 1000, max: 120000 },
    ],
    azure: [
        { name: 'embedding.deployment_name', label: 'Deployment Name', type: 'text' },
        { name: 'embedding.api_version', label: 'API Version', type: 'text' },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
        { name: 'embedding.timeout_ms', label: 'Timeout (ms)', type: 'number', min: 1000, max: 120000 },
    ],
    voyage: [
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
    ],
    cohere: [
        {
            name: 'embedding.input_type', label: 'Input Type', type: 'select',
            options: [
                { label: 'Search Query', value: 'search_query' },
                { label: 'Search Document', value: 'search_document' },
                { label: 'Classification', value: 'classification' },
                { label: 'Clustering', value: 'clustering' },
            ]
        },
        {
            name: 'embedding.truncate', label: 'Truncate', type: 'select',
            options: [
                { label: 'None', value: 'NONE' },
                { label: 'Start', value: 'START' },
                { label: 'End', value: 'END' },
            ]
        },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
    ],
    huggingface: [
        {
            name: 'embedding.device', label: 'Device', type: 'select',
            options: [
                { label: 'CPU', value: 'cpu' },
                { label: 'CUDA', value: 'cuda' },
                { label: 'MPS', value: 'mps' },
            ]
        },
        { name: 'embedding.max_sequence_length', label: 'Max Seq Length', type: 'number', min: 1, max: 2048 },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
        { name: 'embedding.normalize_embeddings', label: 'Normalize Embeddings', type: 'switch', colSpan: 2 },
    ],
    ollama: [
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
    ],
    llama: [
        {
            name: 'embedding.quantization', label: 'Quantization', type: 'select',
            options: [
                { label: 'FP16', value: 'fp16' },
                { label: 'INT8', value: 'int8' },
                { label: 'INT4', value: 'int4' },
            ]
        },
        { name: 'embedding.device_map', label: 'Device Map', type: 'text' },
        { name: 'embedding.model_path', label: 'Model Path (Optional)', type: 'text', colSpan: 2 },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
    ],
    cdp2: [
        { name: 'embedding.checkpoint_path', label: 'Checkpoint Path (Optional)', type: 'text', colSpan: 2 },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
        { name: 'embedding.enable_finetune', label: 'Enable Finetuning', type: 'switch', colSpan: 2 },
        { name: 'embedding.embedding_cache', label: 'Enable Cache', type: 'switch', colSpan: 2 },
    ],
    vlm: [
        {
            name: 'embedding.input_modalities', label: 'Input Modalities', type: 'select',
            options: [
                { label: 'Text', value: 'text' },
                { label: 'Image', value: 'image' },
                { label: 'Both', value: 'both' },
            ]
        },
        { name: 'embedding.image_resolution', label: 'Image Res', type: 'number', min: 128, max: 1024 },
        { name: 'embedding.batch_size', label: 'Batch Size', type: 'number', min: 1, max: 512 },
        { name: 'embedding.normalize_embeddings', label: 'Normalize Embeddings', type: 'switch', colSpan: 2 },
    ]
};

// ----------------------------------------------------
// RETRIEVAL SCHEMAS
// ----------------------------------------------------
export const RETRIEVAL_SCHEMAS: Record<string, FieldConfig[]> = {
    vector: [
        { name: 'retrieval.vector.enabled', label: 'Vector Search', type: 'switch', colSpan: 2 },
        { name: 'retrieval.vector.embedding_model_ref', label: 'Embedding Model Ref', type: 'text', dependsOn: { field: 'retrieval.vector.enabled', value: true } },
        {
            name: 'retrieval.vector.similarity_metric', label: 'Metric', type: 'select',
            options: [{ label: 'Cosine', value: 'cosine' }, { label: 'Dot', value: 'dot' }, { label: 'L2', value: 'l2' }],
            dependsOn: { field: 'retrieval.vector.enabled', value: true }
        },
        { name: 'retrieval.vector.top_k', label: 'Top-K', type: 'slider', min: 1, max: 100, step: 1, colSpan: 2, dependsOn: { field: 'retrieval.vector.enabled', value: true } },
        { name: 'retrieval.vector.score_threshold', label: 'Score Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.vector.enabled', value: true } },
        { name: 'retrieval.vector.enable_score_normalization', label: 'Normalize Scores', type: 'switch', dependsOn: { field: 'retrieval.vector.enabled', value: true } },
    ],
    bm25: [
        { name: 'retrieval.bm25.enabled', label: 'BM25 Sparse Search', type: 'switch', colSpan: 2 },
        { name: 'retrieval.bm25.bm25_k1', label: 'K1 (Term Saturation)', type: 'slider', min: 0.0, max: 5.0, step: 0.1, colSpan: 2, dependsOn: { field: 'retrieval.bm25.enabled', value: true } },
        { name: 'retrieval.bm25.bm25_b', label: 'B (Length Normalization)', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.bm25.enabled', value: true } },
        { name: 'retrieval.bm25.top_k', label: 'Top-K', type: 'number', min: 1, max: 100, dependsOn: { field: 'retrieval.bm25.enabled', value: true } },
        { name: 'retrieval.bm25.min_term_match', label: 'Min Terms', type: 'number', min: 1, max: 10, dependsOn: { field: 'retrieval.bm25.enabled', value: true } },
    ],
    hybrid: [
        { name: 'retrieval.hybrid.enabled', label: 'Hybrid Fusion', type: 'switch', colSpan: 2 },
        { name: 'retrieval.hybrid.dense_weight', label: 'Dense Weight', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.hybrid.enabled', value: true } },
        { name: 'retrieval.hybrid.sparse_weight', label: 'Sparse Weight', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.hybrid.enabled', value: true } },
        {
            name: 'retrieval.hybrid.fusion_strategy', label: 'Fusion Strategy', type: 'select',
            options: [{ label: 'Weighted Sum', value: 'weighted_sum' }, { label: 'RRF', value: 'rrf' }],
            dependsOn: { field: 'retrieval.hybrid.enabled', value: true }
        },
        { name: 'retrieval.hybrid.normalize_scores', label: 'Normalize Scores', type: 'switch', colSpan: 2, dependsOn: { field: 'retrieval.hybrid.enabled', value: true } },
    ],
    rerank: [
        { name: 'retrieval.rerank.enabled', label: 'Cross-Encoder Reranking', type: 'switch', colSpan: 2 },
        {
            name: 'retrieval.rerank.provider', label: 'Provider', type: 'select',
            options: [{ label: 'Cohere', value: 'cohere' }, { label: 'OpenAI', value: 'openai' }, { label: 'Local', value: 'local' }],
            dependsOn: { field: 'retrieval.rerank.enabled', value: true }
        },
        { name: 'retrieval.rerank.model', label: 'Model', type: 'text', dependsOn: { field: 'retrieval.rerank.enabled', value: true } },
        { name: 'retrieval.rerank.top_n', label: 'Top-N Final', type: 'number', min: 1, max: 50, dependsOn: { field: 'retrieval.rerank.enabled', value: true } },
        { name: 'retrieval.rerank.rerank_batch_size', label: 'Batch Size', type: 'number', min: 1, max: 128, dependsOn: { field: 'retrieval.rerank.enabled', value: true } },
        { name: 'retrieval.rerank.rerank_threshold', label: 'Min Score Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.rerank.enabled', value: true } },
        { name: 'retrieval.rerank.score_normalization', label: 'Normalize Final Score', type: 'switch', colSpan: 2, dependsOn: { field: 'retrieval.rerank.enabled', value: true } },
    ],
    graph: [
        { name: 'retrieval.graph.enabled', label: 'Knowledge Graph Retrieval', type: 'switch', colSpan: 2 },
        {
            name: 'retrieval.graph.graph_type', label: 'Graph Type', type: 'select',
            options: [{ label: 'Knowledge Graph', value: 'knowledge' }, { label: 'Document Relationships', value: 'document_relationship' }],
            dependsOn: { field: 'retrieval.graph.enabled', value: true }
        },
        { name: 'retrieval.graph.max_hops', label: 'Max Hops', type: 'number', min: 1, max: 5, dependsOn: { field: 'retrieval.graph.enabled', value: true } },
        { name: 'retrieval.graph.node_score_decay', label: 'Score Decay per Hop', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.graph.enabled', value: true } },
        { name: 'retrieval.graph.graph_confidence_threshold', label: 'Confidence Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2, dependsOn: { field: 'retrieval.graph.enabled', value: true } },
        { name: 'retrieval.graph.merge_graph_with_vector', label: 'Context Fusion', type: 'switch', colSpan: 2, dependsOn: { field: 'retrieval.graph.enabled', value: true } }
    ],
    advanced: [
        { name: 'retrieval.advanced.query_embedding_batch_size', label: 'Query Batch Size', type: 'number', min: 1, max: 32 },
        { name: 'retrieval.advanced.max_query_tokens', label: 'Max Query Tokens', type: 'number', min: 64, max: 2048 },
        {
            name: 'retrieval.advanced.pm125_mode', label: 'PM125 Heuristic Filtering', type: 'select',
            options: [{ label: 'Off', value: 'off' }, { label: 'Relaxed', value: 'relaxed' }, { label: 'Strict', value: 'strict' }],
            colSpan: 2
        },
        { name: 'retrieval.advanced.enable_query_expansion', label: 'Enable HyDE / Expansion', type: 'switch', colSpan: 2 }
    ]
};

// ----------------------------------------------------
// GENERATION SCHEMAS
// ----------------------------------------------------
const BASE_GENERATION: FieldConfig[] = [
    { name: 'generation.temperature', label: 'Temperature', type: 'slider', min: 0.0, max: 2.0, step: 0.05, colSpan: 2 },
    { name: 'generation.top_p', label: 'Top-P (Nucleus)', type: 'slider', min: 0.0, max: 1.0, step: 0.05, colSpan: 2 },
    { name: 'generation.max_output_tokens', label: 'Max Generation Tokens', type: 'number', min: 1, max: 128000 },
    { name: 'generation.streaming', label: 'Enable Streaming UI', type: 'switch', colSpan: 2 }
];

export const GENERATION_SCHEMAS: Record<string, FieldConfig[]> = {
    openai: [
        ...BASE_GENERATION,
        { name: 'generation.presence_penalty', label: 'Presence Penalty', type: 'slider', min: -2.0, max: 2.0, step: 0.1, colSpan: 2 },
        { name: 'generation.frequency_penalty', label: 'Frequency Penalty', type: 'slider', min: -2.0, max: 2.0, step: 0.1, colSpan: 2 },
    ],
    azure: [
        { name: 'generation.deployment_name', label: 'Deployment Name', type: 'text', colSpan: 2 },
        { name: 'generation.api_version', label: 'API Version', type: 'text', colSpan: 2 },
        ...BASE_GENERATION,
        { name: 'generation.presence_penalty', label: 'Presence Penalty', type: 'slider', min: -2.0, max: 2.0, step: 0.1, colSpan: 2 },
        { name: 'generation.frequency_penalty', label: 'Frequency Penalty', type: 'slider', min: -2.0, max: 2.0, step: 0.1, colSpan: 2 },
    ],
    llama: [
        ...BASE_GENERATION,
        { name: 'generation.top_k', label: 'Top-K', type: 'number', min: 1, max: 100 },
        { name: 'generation.repeat_penalty', label: 'Repeat Penalty', type: 'slider', min: 0.0, max: 2.0, step: 0.1, colSpan: 2 },
        {
            name: 'generation.device', label: 'Device', type: 'select',
            options: [{ label: 'CPU', value: 'cpu' }, { label: 'CUDA', value: 'cuda' }, { label: 'MPS', value: 'mps' }]
        },
        {
            name: 'generation.quantization', label: 'Quantization', type: 'select',
            options: [{ label: 'FP16', value: 'fp16' }, { label: 'INT8', value: 'int8' }, { label: 'INT4', value: 'int4' }]
        },
        { name: 'generation.model_path', label: 'Model Path (Optional)', type: 'text', colSpan: 2 },
    ],
    cdp2: [
        ...BASE_GENERATION,
        { name: 'generation.top_k', label: 'Top-K', type: 'number', min: 1, max: 100 },
        { name: 'generation.repeat_penalty', label: 'Repeat Penalty', type: 'slider', min: 0.0, max: 2.0, step: 0.1, colSpan: 2 },
        { name: 'generation.checkpoint_path', label: 'Checkpoint Path (Optional)', type: 'text', colSpan: 2 },
    ],
    vlm: [
        ...BASE_GENERATION,
        {
            name: 'generation.input_modalities', label: 'Input Modalities', type: 'select',
            options: [{ label: 'Text', value: 'text' }, { label: 'Image', value: 'image' }, { label: 'Both', value: 'both' }],
            colSpan: 2
        },
        { name: 'generation.image_max_resolution', label: 'Max Image Res', type: 'number', min: 256, max: 2048 },
    ]
};
// ----------------------------------------------------
// RUNTIME SCHEMAS
// ----------------------------------------------------
export const RUNTIME_SCHEMAS: Record<string, FieldConfig[]> = {
    think: [
        { name: 'runtime.think.max_loops', label: 'Max Loops', type: 'slider', min: 1, max: 10, step: 1, colSpan: 2 },
        { name: 'runtime.think.reflection_depth', label: 'Reflection Depth', type: 'slider', min: 1, max: 5, step: 1, colSpan: 2 },
    ],
    deep: [
        { name: 'runtime.deep.max_loops', label: 'Multi-path Max Loops', type: 'slider', min: 1, max: 20, step: 1, colSpan: 2 },
        { name: 'runtime.deep.multi_query_limit', label: 'Query Expansion Limit', type: 'slider', min: 1, max: 10, step: 1, colSpan: 2 },
    ],
    common: [
        { name: 'runtime.stream_thoughts', label: 'Stream Thoughts', type: 'switch', description: 'See internal reasoning LIVE', colSpan: 1 },
        {
            name: 'runtime.tracing.trace_level', label: 'Tracing Level', type: 'select',
            options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Detailed', value: 'detailed' },
                { label: 'Debug', value: 'debug' }
            ],
            description: 'Observability depth',
            colSpan: 1
        },
    ]
};
