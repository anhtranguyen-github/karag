from typing import List, Protocol, runtime_checkable
from backend.app.schemas.chunking import (
    ChunkingConfig, RecursiveChunkingConfig, SentenceChunkingConfig,
    TokenChunkingConfig, SemanticChunkingConfig, FixedLengthChunkingConfig,
    DocumentStructureChunkingConfig
)

@runtime_checkable
class Chunker(Protocol):
    async def chunk(self, text: str, config: ChunkingConfig, workspace_id: str = None) -> List[str]:
        ...

class RecursiveChunker:
    async def chunk(self, text: str, config: RecursiveChunkingConfig, workspace_id: str = None) -> List[str]:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.max_chunk_size,
            chunk_overlap=config.chunk_overlap,
            separators=config.separators,
            keep_separator=config.keep_separator
        )
        return splitter.split_text(text)

class SentenceChunker:
    async def chunk(self, text: str, config: SentenceChunkingConfig, workspace_id: str = None) -> List[str]:
        # Simple sentence splitter if nltk/spaCy not wanted immediately
        # LangChain doesn't have a direct 'SentenceOverlap' splitter easily used without NLTK usually
        # But we can use character splitter with newline/period separators if needed
        # For simplicity and following requirements, we'll use a basic logic or appropriate LC splitter
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        # Using separators that resemble sentence boundaries
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.max_sentences_per_chunk * 100, # heuristic
            chunk_overlap=config.sentence_overlap * 100,
            separators=[". ", "! ", "? "],
            keep_separator=True
        )
        return splitter.split_text(text)

class TokenChunker:
    async def chunk(self, text: str, config: TokenChunkingConfig, workspace_id: str = None) -> List[str]:
        from langchain_text_splitters import TokenTextSplitter
        splitter = TokenTextSplitter(
            chunk_size=config.max_tokens,
            chunk_overlap=config.token_overlap,
            encoding_name="cl100k_base" if config.tokenizer_type == "tiktoken" else None
        )
        return splitter.split_text(text)

class SemanticChunkerImpl:
    async def chunk(self, text: str, config: SemanticChunkingConfig, workspace_id: str = None) -> List[str]:
        from langchain_experimental.text_splitter import SemanticChunker
        from backend.app.providers.embedding import get_embeddings
        provider = await get_embeddings(workspace_id)
        splitter = SemanticChunker(
            provider, 
            breakpoint_threshold_amount=config.similarity_threshold
        )
        return splitter.split_text(text)

class FixedLengthChunker:
    async def chunk(self, text: str, config: FixedLengthChunkingConfig, workspace_id: str = None) -> List[str]:
        from langchain_text_splitters import CharacterTextSplitter
        splitter = CharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            separator=""
        )
        return splitter.split_text(text)

class DocumentStructureChunker:
    async def chunk(self, text: str, config: DocumentStructureChunkingConfig, workspace_id: str = None) -> List[str]:
        # Basic implementation or header-based
        from langchain_text_splitters import MarkdownHeaderTextSplitter
        headers_to_split_on = [("#", "H1"), ("##", "H2"), ("###", "H3")]
        splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
        splits = splitter.split_text(text)
        return [s.page_content for s in splits]

class ChunkingRegistry:
    def __init__(self):
        self._chunkers = {
            "recursive": RecursiveChunker(),
            "sentence": SentenceChunker(),
            "token": TokenChunker(),
            "semantic": SemanticChunkerImpl(),
            "fixed": FixedLengthChunker(),
            "document": DocumentStructureChunker()
        }

    async def chunk_text(self, text: str, config: ChunkingConfig, workspace_id: str = None) -> List[str]:
        chunker = self._chunkers.get(config.strategy)
        if not chunker:
            raise ValueError(f"Unknown chunking strategy: {config.strategy}")
        return await chunker.chunk(text, config, workspace_id=workspace_id)

chunking_registry = ChunkingRegistry()
