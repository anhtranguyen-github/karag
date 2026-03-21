from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.config import PlatformSettings
from app.core.logging import configure_logging
from app.karag_manager import KaragManager
from app.core.middlewares.security import SecurityHeadersMiddleware
from app.core.middlewares.logging import RequestLoggingMiddleware
from app.core.middlewares.rate_limit import RedisRateLimiterMiddleware
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(
        level=app.state.settings.log_level,
        structured=app.state.settings.log_structured,
    )
    app.state.karag_manager = KaragManager.startup()
    yield


def create_app() -> FastAPI:
    settings = PlatformSettings()

    app = FastAPI(
        title="Karag Enterprise RAG Platform",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = settings

    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    
    import os
    if settings.redis_url and not os.getenv("TESTING"):
        app.add_middleware(
            RedisRateLimiterMiddleware,
            redis_url=settings.redis_url,
            limit=1000,
            window=60,
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/health/dependencies")
    def dependency_health(request: Request) -> dict[str, object]:
        karag_manager: KaragManager = request.app.state.karag_manager
        return karag_manager.health_report()

    from app.api.v1.api import api_router as api_v1_router
    app.include_router(api_v1_router, prefix="/api/v1")

    from app.api.v1.endpoints.runtime import router as runtime_router
    app.include_router(runtime_router)
    
    return app


app = create_app()
