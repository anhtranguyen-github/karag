import structlog
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import karag_settings
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
    from backend.app.rag.ingestion import ingestion_pipeline
    from backend.app.core.minio import minio_manager

    from backend.app.core.path_utils import BASE_DIR

    logger.info(
        "infra_init_start", msg="Initializing Infrastructure...", base_dir=str(BASE_DIR)
    )
    minio_manager.ensure_bucket()

    # Dynamically ensure active collection exists (Must follow AI Settings / OpenAI Contract)
    from backend.app.core.settings_manager import settings_manager

    global_settings = settings_manager.get_global_settings()
    target_dim = global_settings.embedding_dim

    logger.info(
        "vector_init",
        msg=f"Ensuring active collection (Dim: {target_dim})",
    )
    await ingestion_pipeline.initialize("default")

    # Cleanup old completed/failed tasks
    from backend.app.services.task.task_service import task_service

    await task_service.reset_running_tasks_on_startup()
    await task_service.cleanup_old_tasks(older_than_hours=24)

    # Start Background Task Worker for resilience
    from backend.app.services.task.task_worker import task_worker

    await task_worker.start()

    logger.info("infra_init_complete", msg="Infrastructure ready.")
    yield

    # STOP worker on shutdown
    await task_worker.stop()

    # Close graph store driver
    from backend.app.core.factory import LangChainFactory

    graph_store = await LangChainFactory.get_graph_store()
    await graph_store.close()


def create_app() -> FastAPI:
    logger.info("app_init_start", msg="Initializing FastAPI app...")
    app = FastAPI(
        title="Karag API",
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
        allow_origins=karag_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Prometheus metrics endpoint
    if karag_settings.METRICS_ENABLED:
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
            "message": "Karag API is running",
            "version": "2.0.0",
        }

    # Include modular routes
    logger.info("router_init", msg="Including API routers...")
    app.include_router(api_v1_router)
    logger.info("router_init_complete", msg="API routers included.")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        messages = []
        for err in errors:
            loc = ".".join([str(part) for part in err["loc"][1:]])
            msg = err["msg"]
            messages.append(f"{loc}: {msg}")
        
        main_message = f"Validation failed: {messages[0]}" if messages else "Validation failed"
        
        response = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "code": "VALIDATION_ERROR",
                "message": main_message,
                "data": {"details": messages},
            },
        )
        origin = request.headers.get("origin")
        if origin and (origin in karag_settings.CORS_ORIGINS or "*" in karag_settings.CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "code": exc.code,
                "message": exc.message,
                "data": exc.params,
            },
        )
        # Manually attach CORS headers
        origin = request.headers.get("origin")
        if origin and (origin in karag_settings.CORS_ORIGINS or "*" in karag_settings.CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @app.exception_handler(Exception)
    async def catch_all_exception_handler(request: Request, exc: Exception):
        logger.error(
            "unhandled_exception", error=str(exc), path=request.url.path, exc_info=True
        )
        response = JSONResponse(
            status_code=500,
            content={
                "success": False,
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "data": {"detail": str(exc)}
                if karag_settings.LOG_LEVEL == "DEBUG"
                else None,
            },
        )
        origin = request.headers.get("origin")
        if origin and (origin in karag_settings.CORS_ORIGINS or "*" in karag_settings.CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=karag_settings.BACKEND_HOST,
        port=karag_settings.BACKEND_PORT,
        reload=True,
    )
