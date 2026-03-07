from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DeploymentMode = Literal["local", "cloud", "hybrid"]


class DeploymentProviders(BaseModel):
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    vector_store_provider: str = "qdrant"
    graph_store_provider: str = "neo4j"


class DeploymentServices(BaseModel):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "karag"
    qdrant_url: str = "http://localhost:6333"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    minio_endpoint: str = "localhost:9000"
    minio_secure: bool = False
    minio_bucket: str = "rag-docs"
    ollama_base_url: str = "http://localhost:11434"
    vllm_base_url: str = "http://localhost:8008/v1"
    llamacpp_base_url: str = "http://localhost:8081/v1"


class DeploymentSecrets(BaseModel):
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    voyage_api_key: str | None = None
    cohere_api_key: str | None = None
    jina_api_key: str | None = None
    qdrant_api_key: str | None = None
    neo4j_password: str | None = None
    minio_access_key: str | None = None
    minio_secret_key: str | None = None


class DeploymentConfig(BaseModel):
    mode: DeploymentMode = "local"
    providers: DeploymentProviders = Field(default_factory=DeploymentProviders)
    services: DeploymentServices = Field(default_factory=DeploymentServices)
    secrets: DeploymentSecrets = Field(default_factory=DeploymentSecrets)


class DeploymentConfigUpdate(BaseModel):
    mode: DeploymentMode | None = None
    providers: DeploymentProviders | None = None
    services: DeploymentServices | None = None
    secrets: DeploymentSecrets | None = None
    clear_secret_keys: list[str] = Field(default_factory=list)


class SecretState(BaseModel):
    configured: bool
    masked_value: str | None = None


class PublicDeploymentConfig(BaseModel):
    mode: DeploymentMode
    providers: DeploymentProviders
    services: DeploymentServices
    secrets: dict[str, SecretState]


class ServiceHealthCheck(BaseModel):
    key: str
    label: str
    status: Literal["ok", "error", "not_configured", "detected", "not_detected"]
    detail: str
    endpoint: str | None = None


class DeploymentVerificationResult(BaseModel):
    mode: DeploymentMode
    checks: list[ServiceHealthCheck]
    healthy: int
    failed: int
    recommendations: list[str] = Field(default_factory=list)
