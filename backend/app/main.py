import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from backend.app.api.v1 import api_v1_router
from backend.app.core.config import ai_settings
from backend.app.core.exceptions import BaseAppException
from backend.app.core.telemetry import init_telemetry
from backend.app.core.middleware import ObservabilityMiddleware

load_dotenv()

# Initialize telemetry FIRST — before any logger is created
# This configures structlog + OTEL tracing based on environment variables
init_telemetry()

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.app.core.minio import minio_manager
    from backend.app.rag.qdrant_provider import qdrant
    from backend.app.services.workspace_service import workspace_service

    logger.info("infra_init_start", msg="Initializing Infrastructure...")
    minio_manager.ensure_bucket()
    
    # Dynamically ensure active collection exists (Must follow AI Settings / OpenAI Contract)
    from backend.app.core.settings_manager import settings_manager
    global_settings = settings_manager.get_global_settings()
    target_dim = global_settings.embedding_dim
    coll_name = qdrant.get_collection_name(target_dim)
    
    logger.info("vector_init", msg=f"Ensuring active collection: {coll_name} (Dim: {target_dim})")
    await qdrant.create_collection(coll_name, target_dim)

    # Ensure default workspace exists
    logger.info("workspace_init", msg="Ensuring default workspace...")
    await workspace_service.ensure_default_workspace()

    # Cleanup old completed/failed tasks
    from backend.app.services.task_service import task_service
    await task_service.cleanup_old_tasks(older_than_hours=24)

    logger.info("infra_init_complete", msg="Infrastructure ready.")
    yield


def create_app() -> FastAPI:
    logger.info("app_init_start", msg="Initializing FastAPI app...")
    app = FastAPI(
        title="Knowledge Bank API",
        description="Modular RAG & Agentic Chatbot API",
        version="2.0.0",
        lifespan=lifespan,
    )

    # Observability middleware: correlation IDs, structured logging, Prometheus metrics
    app.add_middleware(ObservabilityMiddleware)

    # --- Middleware Stack (order matters: outermost first) ---
    # CORS must be added last so it's the outermost layer (handles errors from other middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Prometheus metrics endpoint
    if ai_settings.METRICS_ENABLED:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

        @app.get("/metrics", tags=["observability"], include_in_schema=False)
        async def metrics():
            """Prometheus-compatible metrics endpoint."""
            return JSONResponse(
                content=generate_latest().decode("utf-8"),
                media_type=CONTENT_TYPE_LATEST,
            )

    # Health check
    @app.get("/", tags=["health"])
    async def root():
        return {
            "status": "online",
            "message": "Knowledge Bank API is running",
            "version": "2.0.0",
        }

    # Include modular routes
    logger.info("router_init", msg="Including API routers...")
    app.include_router(api_v1_router)
    logger.info("router_init_complete", msg="API routers included.")

    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "detail": exc.message,
                "params": exc.params,
            },
        )

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=ai_settings.BACKEND_PORT,
        reload=False,
    )
