from pydantic import BaseModel, Field, computed_field
from typing import List, Literal, Union, Annotated, Optional

class OpenAIEmbeddingConfig(BaseModel):
    provider: Literal["openai"] = "openai"
    model: Literal["text-embedding-3-small", "text-embedding-3-large"] = "text-embedding-3-small"
    batch_size: int = Field(default=32, ge=1, le=512)
    timeout_ms: int = Field(default=30000, ge=1000, le=120000)
    retry_limit: int = Field(default=3, ge=0, le=10)
    api_key_ref: Optional[str] = None
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1536 if self.model == "text-embedding-3-small" else 3072

class AzureOpenAIEmbeddingConfig(BaseModel):
    provider: Literal["azure"] = "azure"
    model: Literal["text-embedding-ada-002", "text-embedding-3-large"] = "text-embedding-ada-002"
    deployment_name: str
    api_version: str = "2023-05-15"
    batch_size: int = Field(default=32, ge=1, le=512)
    timeout_ms: int = Field(default=30000, ge=1000, le=120000)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1536 if self.model == "text-embedding-ada-002" else 3072

class VoyageEmbeddingConfig(BaseModel):
    provider: Literal["voyage"] = "voyage"
    model: Literal["voyage-large-2", "voyage-code-2"] = "voyage-large-2"
    batch_size: int = Field(default=32, ge=1, le=512)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1536

class CohereEmbeddingConfig(BaseModel):
    provider: Literal["cohere"] = "cohere"
    model: Literal["embed-english-v3.0", "embed-multilingual-v3.0"] = "embed-english-v3.0"
    input_type: Literal["search_query", "search_document", "classification", "clustering"] = "search_query"
    truncate: Literal["NONE", "START", "END"] = "END"
    batch_size: int = Field(default=32, ge=1, le=512)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1024

class HuggingFaceEmbeddingConfig(BaseModel):
    provider: Literal["huggingface"] = "huggingface"
    model: Literal[
        "sentence-transformers/all-MiniLM-L6-v2", 
        "bge-base-en-v1.5", 
        "bge-large-en-v1.5"
    ] = "bge-base-en-v1.5"
    device: Literal["cpu", "cuda", "mps"] = "cpu"
    normalize_embeddings: bool = True
    batch_size: int = Field(default=32, ge=1, le=512)
    max_sequence_length: int = Field(default=512, ge=1, le=2048)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        mapping = {
            "sentence-transformers/all-MiniLM-L6-v2": 384,
            "bge-base-en-v1.5": 768,
            "bge-large-en-v1.5": 1024
        }
        return mapping.get(self.model, 768)

class OllamaEmbeddingConfig(BaseModel):
    provider: Literal["ollama"] = "ollama"
    model: Literal["mxbai-embed-large", "nomic-embed-text"] = "nomic-embed-text"
    batch_size: int = Field(default=32, ge=1, le=512)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1024 if self.model == "mxbai-embed-large" else 768

class LlamaEmbeddingConfig(BaseModel):
    provider: Literal["llama"] = "llama"
    model: Literal["llama-embedding-7b", "llama-embedding-13b"] = "llama-embedding-7b"
    model_path: Optional[str] = None
    quantization: Literal["fp16", "int8", "int4"] = "fp16"
    device_map: str = "auto"
    batch_size: int = Field(default=32, ge=1, le=512)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 4096 if self.model == "llama-embedding-7b" else 5120

class CDP2EmbeddingConfig(BaseModel):
    provider: Literal["cdp2"] = "cdp2"
    model: Literal["cdp2-embedding-base", "cdp2-embedding-large"] = "cdp2-embedding-base"
    checkpoint_path: Optional[str] = None
    enable_finetune: bool = False
    embedding_cache: bool = True
    batch_size: int = Field(default=32, ge=1, le=512)
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 1024 if self.model == "cdp2-embedding-base" else 2048

class VLMEmbeddingConfig(BaseModel):
    provider: Literal["vlm"] = "vlm"
    model: Literal["clip-vit-b32", "clip-vit-l14"] = "clip-vit-b32"
    input_modalities: Literal["text", "image", "both"] = "both"
    image_resolution: int = Field(default=224, ge=128, le=1024)
    batch_size: int = Field(default=32, ge=1, le=512)
    normalize_embeddings: bool = True
    
    @computed_field
    @property
    def dimensions(self) -> int:
        return 512 if self.model == "clip-vit-b32" else 768

EmbeddingConfig = Annotated[
    Union[
        OpenAIEmbeddingConfig,
        AzureOpenAIEmbeddingConfig,
        VoyageEmbeddingConfig,
        CohereEmbeddingConfig,
        HuggingFaceEmbeddingConfig,
        OllamaEmbeddingConfig,
        LlamaEmbeddingConfig,
        CDP2EmbeddingConfig,
        VLMEmbeddingConfig
    ],
    Field(discriminator="provider")
]
