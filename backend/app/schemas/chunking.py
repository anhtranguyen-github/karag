from pydantic import BaseModel, Field
from typing import List, Literal, Union, Annotated


class RecursiveChunkingConfig(BaseModel):
    strategy: Literal["recursive"] = "recursive"
    max_chunk_size: int = Field(default=800, ge=10, le=4000)
    min_chunk_size: int = Field(default=100, ge=5, le=500)
    chunk_overlap: int = Field(default=150, ge=0, le=1000)
    separators: List[str] = Field(default=["\n\n", "\n", ". ", " "])
    keep_separator: bool = True
    trim_whitespace: bool = True
    fallback_to_sentence: bool = False


class SentenceChunkingConfig(BaseModel):
    strategy: Literal["sentence"] = "sentence"
    max_sentences_per_chunk: int = Field(default=5, ge=1, le=50)
    min_sentences_per_chunk: int = Field(default=1, ge=1, le=10)
    sentence_overlap: int = Field(default=1, ge=0, le=10)
    language: str = "en"
    respect_paragraphs: bool = True
    merge_short_sentences: bool = True


class TokenChunkingConfig(BaseModel):
    strategy: Literal["token"] = "token"
    max_tokens: int = Field(default=512, ge=2, le=4096)
    token_overlap: int = Field(default=50, ge=0, le=500)
    tokenizer_type: Literal["tiktoken", "sentencepiece", "hf"] = "tiktoken"
    count_special_tokens: bool = False
    truncate_overflow: bool = False
    strict_token_limit: bool = True


class SemanticChunkingConfig(BaseModel):
    strategy: Literal["semantic"] = "semantic"
    embedding_model_ref: str = "text-embedding-3-small"
    similarity_threshold: float = Field(default=0.3, ge=0.0, le=1.0)
    max_chunk_tokens: int = Field(default=1024, ge=100, le=8192)
    min_chunk_tokens: int = Field(default=100, ge=10, le=1000)
    merge_small_chunks: bool = True
    semantic_window_size: int = Field(default=3, ge=1, le=10)


class FixedLengthChunkingConfig(BaseModel):
    strategy: Literal["fixed"] = "fixed"
    chunk_size: int = Field(default=1000, ge=1, le=10000)
    chunk_overlap: int = Field(default=200, ge=0, le=2000)
    hard_cut: bool = False
    pad_last_chunk: bool = False


class DocumentStructureChunkingConfig(BaseModel):
    strategy: Literal["document"] = "document"
    split_by: Literal["heading", "section", "page"] = "heading"
    max_section_length: int = Field(default=2000, ge=500, le=10000)
    fallback_strategy: Literal["recursive", "fixed"] = "recursive"
    preserve_hierarchy: bool = True
    include_metadata: bool = True


ChunkingConfig = Annotated[
    Union[
        RecursiveChunkingConfig,
        SentenceChunkingConfig,
        TokenChunkingConfig,
        SemanticChunkingConfig,
        FixedLengthChunkingConfig,
        DocumentStructureChunkingConfig,
    ],
    Field(discriminator="strategy"),
]
