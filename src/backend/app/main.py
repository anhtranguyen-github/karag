from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.container import PlatformContainer, create_platform_container
from app.modules.evaluation_datasets.controllers import router as evaluation_datasets_router
from app.modules.knowledge_datasets.controllers import router as knowledge_datasets_router
from app.modules.model_registry.controllers import router as model_registry_router
from app.modules.organizations.controllers import router as organizations_router
from app.modules.observability.controllers import router as observability_router
from app.modules.runtime.controllers import router as runtime_router
from app.modules.workspaces.controllers import router as workspaces_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.container = create_platform_container()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Karag Enterprise RAG Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/health/dependencies")
    def dependency_health() -> dict[str, object]:
        container: PlatformContainer = app.state.container
        return container.health_report()

    app.include_router(knowledge_datasets_router)
    app.include_router(evaluation_datasets_router)
    app.include_router(model_registry_router)
    app.include_router(organizations_router)
    app.include_router(observability_router)
    app.include_router(runtime_router)
    app.include_router(workspaces_router)
    return app


app = create_app()
