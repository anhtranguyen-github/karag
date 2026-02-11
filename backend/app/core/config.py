from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class AISettings(BaseSettings):
    # LLM Configuration
    LLM_PROVIDER: str = "openai"  # openai, anthropic, ollama, vllm, llama-cpp
    LLM_MODEL: str = "gpt-4o"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    VLLM_BASE_URL: str = "http://localhost:8008/v1"
    LLAMACPP_BASE_URL: str = "http://localhost:8081/v1"
    BACKEND_PORT: int = 8000
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "openai"  # openai, voyage, local, ollama, vllm, llama-cpp
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    VOYAGE_API_KEY: Optional[str] = None
    LOCAL_EMBEDDING_MODEL: str = "BAAI/bge-large-en-v1.5"
    
    # RAG Configuration
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    HYBRID_SEARCH_ALPHA: float = 0.5  # Balance between vector and keyword
    
    # MongoDB Configuration
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "ai_architect"

    # MinIO Configuration
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "rag-docs"

    # Observability Configuration
    OTEL_ENABLED: bool = False  # Master switch for distributed tracing
    OTEL_EXPORTER_ENDPOINT: str = "http://localhost:4317"  # OTLP gRPC endpoint
    OTEL_SERVICE_NAME: str = "scienchan-backend"
    OTEL_SAMPLE_RATE: float = 1.0  # 1.0 = 100% in dev, lower in prod
    METRICS_ENABLED: bool = True  # Prometheus metrics at /metrics
    LOG_FORMAT: str = "json"  # "json" for production, "console" for dev
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = "logs/app.log"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow"
    )

ai_settings = AISettings()
