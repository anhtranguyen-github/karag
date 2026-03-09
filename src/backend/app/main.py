from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.container import PlatformContainer, create_platform_container
from app.modules.evaluation_datasets.controllers import router as evaluation_datasets_router
from app.modules.knowledge_datasets.controllers import router as knowledge_datasets_router
from app.modules.model_registry.controllers import router as model_registry_router
from app.modules.organizations.controllers import router as organizations_router
from app.modules.observability.controllers import router as observability_router
from app.modules.runtime.controllers import router as runtime_router
from app.modules.workspaces.controllers import router as workspaces_router
from app.modules.api_keys.controllers import router as api_keys_router
from app.modules.providers.controllers import router as providers_router
from app.core.rate_limit import RedisRateLimiterMiddleware
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.container = create_platform_container()
    yield


def create_app() -> FastAPI:
    # Initialize container once to get settings
    container = create_platform_container()
    settings = container.settings

    app = FastAPI(
        title="Karag Enterprise RAG Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    
    if settings.redis_url:
        app.add_middleware(
            RedisRateLimiterMiddleware,
            redis_url=settings.redis_url,
            limit=100,
            window=60,
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/health/dependencies")
    def dependency_health(request: Request) -> dict[str, object]:
        platform_container: PlatformContainer = request.app.state.container
        return platform_container.health_report()

    app.include_router(api_keys_router)
    app.include_router(knowledge_datasets_router)
    app.include_router(evaluation_datasets_router)
    app.include_router(model_registry_router)
    app.include_router(organizations_router)
    app.include_router(observability_router)
    app.include_router(runtime_router)
    app.include_router(providers_router)
    app.include_router(workspaces_router)
    
    return app


app = create_app()
