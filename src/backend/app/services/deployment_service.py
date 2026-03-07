from __future__ import annotations

import json
import os
from pathlib import Path

import httpx
import structlog
from minio import Minio
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase
from qdrant_client import AsyncQdrantClient
from src.backend.app.core.config import karag_settings
from src.backend.app.schemas.deployment import (
    DeploymentConfig,
    DeploymentConfigUpdate,
    DeploymentVerificationResult,
    PublicDeploymentConfig,
    SecretState,
    ServiceHealthCheck,
)

logger = structlog.get_logger(__name__)


class DeploymentService:
    def __init__(self) -> None:
        self.config_path = Path("src/backend/data/deployment_config.json")

    def _default_config(self) -> DeploymentConfig:
        mode = "cloud" if karag_settings.OPENAI_API_KEY and "cloud.qdrant.io" in karag_settings.QDRANT_URL else "local"
        return DeploymentConfig(
            mode=mode,
            providers={
                "llm_provider": karag_settings.LLM_PROVIDER,
                "llm_model": karag_settings.LLM_MODEL,
                "embedding_provider": karag_settings.EMBEDDING_PROVIDER,
                "embedding_model": karag_settings.EMBEDDING_MODEL,
                "vector_store_provider": os.getenv("VECTOR_STORE_PROVIDER", "qdrant"),
                "graph_store_provider": os.getenv("GRAPH_STORE_PROVIDER", "neo4j"),
            },
            services={
                "mongo_uri": karag_settings.MONGO_URI,
                "mongo_db": karag_settings.MONGO_DB,
                "qdrant_url": karag_settings.QDRANT_URL,
                "neo4j_uri": karag_settings.NEO4J_URI,
                "neo4j_user": karag_settings.NEO4J_USER,
                "minio_endpoint": karag_settings.MINIO_ENDPOINT,
                "minio_secure": karag_settings.MINIO_SECURE,
                "minio_bucket": karag_settings.MINIO_BUCKET,
                "ollama_base_url": karag_settings.OLLAMA_BASE_URL,
                "vllm_base_url": karag_settings.VLLM_BASE_URL,
                "llamacpp_base_url": karag_settings.LLAMACPP_BASE_URL,
            },
            secrets={
                "openai_api_key": karag_settings.OPENAI_API_KEY,
                "anthropic_api_key": karag_settings.ANTHROPIC_API_KEY,
                "voyage_api_key": karag_settings.VOYAGE_API_KEY,
                "cohere_api_key": karag_settings.COHERE_API_KEY,
                "jina_api_key": karag_settings.JINA_API_KEY,
                "qdrant_api_key": karag_settings.QDRANT_API_KEY,
                "neo4j_password": karag_settings.NEO4J_PASSWORD,
                "minio_access_key": karag_settings.MINIO_ACCESS_KEY,
                "minio_secret_key": karag_settings.MINIO_SECRET_KEY,
            },
        )

    def load_config(self) -> DeploymentConfig:
        if not self.config_path.exists():
            config = self._default_config()
            self.save_config(config)
            return config

        with open(self.config_path) as f:
            return DeploymentConfig.model_validate(json.load(f))

    def save_config(self, config: DeploymentConfig) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w") as f:
            json.dump(config.model_dump(), f, indent=2)

    def _mask_secret(self, value: str | None) -> str | None:
        if not value:
            return None
        if len(value) <= 8:
            return "*" * len(value)
        return f"{value[:4]}...{value[-4:]}"

    def get_public_config(self) -> PublicDeploymentConfig:
        config = self.load_config()
        return PublicDeploymentConfig(
            mode=config.mode,
            providers=config.providers,
            services=config.services,
            secrets={
                key: SecretState(configured=bool(value), masked_value=self._mask_secret(value))
                for key, value in config.secrets.model_dump().items()
            },
        )

    def apply_runtime_config(self, config: DeploymentConfig) -> None:
        updates = {
            "LLM_PROVIDER": config.providers.llm_provider,
            "LLM_MODEL": config.providers.llm_model,
            "EMBEDDING_PROVIDER": config.providers.embedding_provider,
            "EMBEDDING_MODEL": config.providers.embedding_model,
            "VECTOR_STORE_PROVIDER": config.providers.vector_store_provider,
            "GRAPH_STORE_PROVIDER": config.providers.graph_store_provider,
            "MONGO_URI": config.services.mongo_uri,
            "MONGO_DB": config.services.mongo_db,
            "QDRANT_URL": config.services.qdrant_url,
            "NEO4J_URI": config.services.neo4j_uri,
            "NEO4J_USER": config.services.neo4j_user,
            "MINIO_ENDPOINT": config.services.minio_endpoint,
            "MINIO_BUCKET": config.services.minio_bucket,
            "MINIO_SECURE": str(config.services.minio_secure).lower(),
            "OLLAMA_BASE_URL": config.services.ollama_base_url,
            "VLLM_BASE_URL": config.services.vllm_base_url,
            "LLAMACPP_BASE_URL": config.services.llamacpp_base_url,
            "OPENAI_API_KEY": config.secrets.openai_api_key or "",
            "ANTHROPIC_API_KEY": config.secrets.anthropic_api_key or "",
            "VOYAGE_API_KEY": config.secrets.voyage_api_key or "",
            "COHERE_API_KEY": config.secrets.cohere_api_key or "",
            "JINA_API_KEY": config.secrets.jina_api_key or "",
            "QDRANT_API_KEY": config.secrets.qdrant_api_key or "",
            "NEO4J_PASSWORD": config.secrets.neo4j_password or "",
            "MINIO_ACCESS_KEY": config.secrets.minio_access_key or "",
            "MINIO_SECRET_KEY": config.secrets.minio_secret_key or "",
        }
        for key, value in updates.items():
            os.environ[key] = value
            if hasattr(karag_settings, key):
                setattr(karag_settings, key, value)

        # Preserve boolean typing for runtime consumers.
        karag_settings.MINIO_SECURE = config.services.minio_secure

    def update_config(self, update: DeploymentConfigUpdate) -> PublicDeploymentConfig:
        current = self.load_config()
        merged = current.model_copy(deep=True)

        if update.mode is not None:
            merged.mode = update.mode
        if update.providers is not None:
            merged.providers = update.providers
        if update.services is not None:
            merged.services = update.services
        if update.secrets is not None:
            current_secrets = merged.secrets.model_dump()
            for key, value in update.secrets.model_dump().items():
                if value:
                    current_secrets[key] = value
            for key in update.clear_secret_keys:
                if key in current_secrets:
                    current_secrets[key] = None
            merged.secrets = type(merged.secrets)(**current_secrets)

        self.save_config(merged)
        self.apply_runtime_config(merged)
        return self.get_public_config()

    async def _check_http(
        self, key: str, label: str, url: str, path: str = "", timeout: float = 3.0
    ) -> ServiceHealthCheck:
        target = f"{url.rstrip('/')}{path}"
        try:
            async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
                response = await client.get(target)
            ok = response.status_code < 500
            return ServiceHealthCheck(
                key=key,
                label=label,
                status="ok" if ok else "error",
                detail=f"HTTP {response.status_code}",
                endpoint=target,
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key=key,
                label=label,
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint=target,
            )

    async def detect_local_services(self) -> DeploymentVerificationResult:
        checks = [
            await self._check_http("qdrant", "Qdrant", "http://127.0.0.1:6333"),
            await self._check_http("minio", "MinIO", "http://127.0.0.1:9000", "/minio/health/live"),
            await self._check_http("ollama", "Ollama", "http://127.0.0.1:11434", "/api/tags"),
            await self._check_http("vllm", "vLLM", "http://127.0.0.1:8008", "/v1/models"),
            await self._check_http("llamacpp", "llama.cpp", "http://127.0.0.1:8081", "/health"),
            await self._detect_mongo(),
            await self._detect_neo4j(),
        ]
        normalized_checks = [
            check.model_copy(update={"status": "detected" if check.status == "ok" else "not_detected"})
            for check in checks
        ]
        detected = sum(check.status == "detected" for check in normalized_checks)
        failed = len(normalized_checks) - detected
        recommendations = [
            f"Start or configure {check.label}." for check in normalized_checks if check.status == "not_detected"
        ]
        return DeploymentVerificationResult(
            mode="local",
            checks=normalized_checks,
            healthy=detected,
            failed=failed,
            recommendations=recommendations,
        )

    async def _detect_mongo(self) -> ServiceHealthCheck:
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=3000)
        try:
            await client.admin.command("ping")
            return ServiceHealthCheck(
                key="mongo",
                label="MongoDB",
                status="ok",
                detail="Ping succeeded",
                endpoint="mongodb://127.0.0.1:27017",
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="mongo",
                label="MongoDB",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint="mongodb://127.0.0.1:27017",
            )
        finally:
            client.close()

    async def _detect_neo4j(self) -> ServiceHealthCheck:
        driver = AsyncGraphDatabase.driver("bolt://127.0.0.1:7687", auth=("neo4j", "neo4j_password"))
        try:
            await driver.verify_connectivity()
            return ServiceHealthCheck(
                key="neo4j",
                label="Neo4j",
                status="ok",
                detail="Connectivity verified",
                endpoint="bolt://127.0.0.1:7687",
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="neo4j",
                label="Neo4j",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint="bolt://127.0.0.1:7687",
            )
        finally:
            await driver.close()

    async def verify_config(self) -> DeploymentVerificationResult:
        config = self.load_config()
        checks = [
            await self._verify_qdrant(config),
            await self._verify_neo4j(config),
            await self._verify_mongo(config),
            await self._verify_minio(config),
            await self._verify_openai(config),
            await self._check_http("ollama", "Ollama", config.services.ollama_base_url, "/api/tags"),
            await self._check_http("vllm", "vLLM", config.services.vllm_base_url.replace("/v1", ""), "/v1/models"),
            await self._check_http(
                "llamacpp", "llama.cpp", config.services.llamacpp_base_url.replace("/v1", ""), "/health"
            ),
        ]
        healthy = sum(check.status == "ok" for check in checks)
        failed = sum(check.status == "error" for check in checks)
        recommendations = [f"Review {check.label}: {check.detail}" for check in checks if check.status == "error"]
        recommendations.extend(
            f"Configure {check.label} credentials in Deployment settings."
            for check in checks
            if check.status == "not_configured"
        )
        return DeploymentVerificationResult(
            mode=config.mode,
            checks=checks,
            healthy=healthy,
            failed=failed,
            recommendations=recommendations,
        )

    async def _verify_qdrant(self, config: DeploymentConfig) -> ServiceHealthCheck:
        if not config.services.qdrant_url:
            return ServiceHealthCheck(
                key="qdrant", label="Qdrant", status="not_configured", detail="Missing Qdrant URL"
            )
        try:
            client = AsyncQdrantClient(
                url=config.services.qdrant_url,
                api_key=config.secrets.qdrant_api_key,
                timeout=10.0,
            )
            await client.get_collections()
            await client.close()
            return ServiceHealthCheck(
                key="qdrant",
                label="Qdrant",
                status="ok",
                detail="Collections query succeeded",
                endpoint=config.services.qdrant_url,
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="qdrant",
                label="Qdrant",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint=config.services.qdrant_url,
            )

    async def _verify_neo4j(self, config: DeploymentConfig) -> ServiceHealthCheck:
        if not (config.services.neo4j_uri and config.services.neo4j_user and config.secrets.neo4j_password):
            return ServiceHealthCheck(
                key="neo4j", label="Neo4j", status="not_configured", detail="Missing Neo4j connection details"
            )
        driver = AsyncGraphDatabase.driver(
            config.services.neo4j_uri,
            auth=(config.services.neo4j_user, config.secrets.neo4j_password),
        )
        try:
            await driver.verify_connectivity()
            return ServiceHealthCheck(
                key="neo4j",
                label="Neo4j",
                status="ok",
                detail="Connectivity verified",
                endpoint=config.services.neo4j_uri,
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="neo4j",
                label="Neo4j",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint=config.services.neo4j_uri,
            )
        finally:
            await driver.close()

    async def _verify_mongo(self, config: DeploymentConfig) -> ServiceHealthCheck:
        if not config.services.mongo_uri:
            return ServiceHealthCheck(
                key="mongo", label="MongoDB", status="not_configured", detail="Missing MongoDB URI"
            )
        client = AsyncIOMotorClient(config.services.mongo_uri, serverSelectionTimeoutMS=5000)
        try:
            await client.admin.command("ping")
            return ServiceHealthCheck(
                key="mongo",
                label="MongoDB",
                status="ok",
                detail="Ping succeeded",
                endpoint=config.services.mongo_uri,
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="mongo",
                label="MongoDB",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint=config.services.mongo_uri,
            )
        finally:
            client.close()

    async def _verify_minio(self, config: DeploymentConfig) -> ServiceHealthCheck:
        if not (config.services.minio_endpoint and config.secrets.minio_access_key and config.secrets.minio_secret_key):
            return ServiceHealthCheck(
                key="minio", label="MinIO", status="not_configured", detail="Missing MinIO connection details"
            )
        try:
            client = Minio(
                config.services.minio_endpoint,
                access_key=config.secrets.minio_access_key,
                secret_key=config.secrets.minio_secret_key,
                secure=config.services.minio_secure,
            )
            client.bucket_exists(config.services.minio_bucket)
            return ServiceHealthCheck(
                key="minio",
                label="MinIO",
                status="ok",
                detail="Bucket lookup succeeded",
                endpoint=config.services.minio_endpoint,
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="minio",
                label="MinIO",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint=config.services.minio_endpoint,
            )

    async def _verify_openai(self, config: DeploymentConfig) -> ServiceHealthCheck:
        if not config.secrets.openai_api_key:
            return ServiceHealthCheck(
                key="openai", label="OpenAI", status="not_configured", detail="Missing OpenAI API key"
            )
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {config.secrets.openai_api_key}"},
                )
            if response.status_code == 200:
                return ServiceHealthCheck(
                    key="openai",
                    label="OpenAI",
                    status="ok",
                    detail="Models API responded",
                    endpoint="https://api.openai.com/v1/models",
                )
            return ServiceHealthCheck(
                key="openai",
                label="OpenAI",
                status="error",
                detail=f"HTTP {response.status_code}",
                endpoint="https://api.openai.com/v1/models",
            )
        except Exception as exc:
            return ServiceHealthCheck(
                key="openai",
                label="OpenAI",
                status="error",
                detail=f"{type(exc).__name__}: {exc}",
                endpoint="https://api.openai.com/v1/models",
            )


deployment_service = DeploymentService()
