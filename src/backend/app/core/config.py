from pydantic_settings import BaseSettings, SettingsConfigDict


class KaragSettings(BaseSettings):
    # LLM Configuration
    LLM_PROVIDER: str = "openai"  # openai, anthropic, ollama, vllm, llama-cpp
    LLM_MODEL: str = "gpt-4o"
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    VLLM_BASE_URL: str = "http://localhost:8008/v1"
    LLAMACPP_BASE_URL: str = "http://localhost:8081/v1"
    BACKEND_HOST: str = "0.0.0.0"  # nosec B104
    BACKEND_PORT: int = 8000

    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "openai"  # openai, voyage, local, ollama, vllm, llama-cpp
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    VOYAGE_API_KEY: str | None = None
    COHERE_API_KEY: str | None = None
    JINA_API_KEY: str | None = None
    LOCAL_EMBEDDING_MODEL: str = "BAAI/bge-large-en-v1.5"

    # RAG Configuration
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    HYBRID_SEARCH_ALPHA: float = 0.5  # Balance between vector and keyword

    # MongoDB Configuration
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "karag"

    # MinIO Configuration
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "rag-docs"

    # Neo4j Configuration
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "neo4j_password"

    # Observability Configuration
    OTEL_ENABLED: bool = False  # Master switch for distributed tracing
    OTEL_EXPORTER_ENDPOINT: str = "http://localhost:4317"  # OTLP gRPC endpoint
    OTEL_SERVICE_NAME: str = "karag-backend"
    OTEL_SAMPLE_RATE: float = 1.0  # 1.0 = 100% in dev, lower in prod
    METRICS_ENABLED: bool = True  # Prometheus metrics at /metrics
    LOG_FORMAT: str = "json"  # "json" for production, "console" for dev
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str | None = "logs/app.log"

    # API Configuration
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Auth Configuration
    SECRET_KEY: str = "your-super-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


karag_settings = KaragSettings()
