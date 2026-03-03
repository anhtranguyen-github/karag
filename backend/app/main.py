"""
Karag API - Modular RAG & Agentic Chatbot API

This module initializes the FastAPI application with proper lifecycle management,
middleware stack, exception handling, and routing configuration.

Following FastAPI best practices:
- Async-first architecture
- Proper lifespan context management
- Structured error handling
- Comprehensive observability
- Security best practices
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import structlog
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.app.api.errors import ErrorHandlerMiddleware
from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import karag_settings
from backend.app.core.exceptions import BaseAppException
from backend.app.core.middleware import (
    ObservabilityMiddleware,
    SecurityHeadersMiddleware,
)
from backend.app.core.prompt_registry import PromptStatus, PromptVersion, prompt_registry
from backend.app.core.telemetry import init_telemetry

# Load environment variables before any other initialization
load_dotenv()

# Initialize telemetry FIRST — before any logger is created
# This configures structlog + OTEL tracing based on environment variables
init_telemetry()

logger = structlog.get_logger(__name__)


class HealthCheckResponse(BaseModel):
    """Health check response model."""
    status: str
    message: str
    version: str
    environment: str


class AppMetadata:
    """Application metadata constants."""
    TITLE: str = "Karag API"
    DESCRIPTION: str = "Modular RAG & Agentic Chatbot API"
    VERSION: str = "2.0.0"
    CONTACT = {
        "name": "Karag Team",
        "url": "https://github.com/karag-ai/karag",
    }
    LICENSE_INFO = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    }


def _attach_cors_headers(
    response: JSONResponse,
    request: Request,
) -> JSONResponse:
    """
    Attach CORS headers to response if origin is allowed.
    
    Args:
        response: The JSON response to modify
        request: The incoming request to check for origin
        
    Returns:
        The modified response with CORS headers if applicable
    """
    origin = request.headers.get("origin")
    allowed_origins = karag_settings.CORS_ORIGINS
    
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response


async def _initialize_infrastructure() -> None:
    """Initialize all infrastructure components during startup."""
    from backend.app.core.minio import minio_manager
    from backend.app.core.path_utils import BASE_DIR
    
    logger.info(
        "infra_init_start",
        msg="Initializing Infrastructure...",
        base_dir=str(BASE_DIR),
    )
    
    # Initialize MinIO bucket
    minio_manager.ensure_bucket()


async def _initialize_vector_store() -> None:
    """Initialize vector store with correct embedding dimensions."""
    from backend.app.core.settings_manager import settings_manager
    from backend.app.rag.ingestion import ingestion_pipeline
    
    global_settings = settings_manager.get_global_settings()
    target_dim = global_settings.embedding_dim

    logger.info(
        "vector_init",
        msg=f"Ensuring active collection (Dim: {target_dim})",
        embedding_dim=target_dim,
    )
    await ingestion_pipeline.initialize("default")


async def _initialize_task_system() -> None:
    """Initialize task management system."""
    from backend.app.services.task.task_service import task_service
    from backend.app.services.task.task_worker import task_worker

    # Cleanup old completed/failed tasks
    await task_service.reset_running_tasks_on_startup()
    await task_service.cleanup_old_tasks(older_than_hours=24)

    # Start Background Task Worker for resilience
    await task_worker.start()


async def _initialize_prompt_registry() -> None:
    """Register default prompts in the prompt registry."""
    logger.info("prompt_registry_init", msg="Initializing prompt registry...")

    prompts: list[PromptVersion] = [
        PromptVersion(
            name="rag_generation",
            version="1.0.0",
            template="""Answer the user's question based ONLY on the following context.
If the context doesn't contain enough information, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Answer:""",
            variables=["context", "question"],
            description="Standard RAG generation prompt",
            status=PromptStatus.ACTIVE,
        ),
        PromptVersion(
            name="intent_analysis",
            version="1.0.0",
            template="""Analyze the user's query and determine the intent.

Query: {query}

Intent: """,
            variables=["query"],
            description="Intent analysis for routing",
            status=PromptStatus.ACTIVE,
        ),
    ]

    for prompt in prompts:
        await prompt_registry.register(prompt)

    logger.info("prompt_registry_init_complete", prompts=len(prompts))


async def _shutdown_services() -> None:
    """Gracefully shutdown all services."""
    from backend.app.core.factory import LangChainFactory
    from backend.app.services.task.task_worker import task_worker

    # Stop task worker
    await task_worker.stop()

    # Close graph store driver
    graph_store = await LangChainFactory.get_graph_store()
    await graph_store.close()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.
    
    Handles initialization on startup and cleanup on shutdown.
    All exceptions during initialization are logged and re-raised
    to prevent the app from starting in an inconsistent state.
    
    Args:
        app: The FastAPI application instance
        
    Yields:
        None
    """
    try:
        await _initialize_infrastructure()
        await _initialize_vector_store()
        await _initialize_task_system()
        await _initialize_prompt_registry()

        logger.info("infra_init_complete", msg="Infrastructure ready.")
        yield

    except Exception as e:
        logger.error("infra_init_failed", error=str(e), exc_info=True)
        raise

    finally:
        try:
            await _shutdown_services()
            logger.info("infra_shutdown_complete", msg="Infrastructure shut down.")
        except Exception as e:
            logger.error("infra_shutdown_error", error=str(e), exc_info=True)


def _setup_exception_handlers(app: FastAPI) -> None:
    """
    Configure exception handlers for the application.
    
    Args:
        app: The FastAPI application instance
    """

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Handle Pydantic validation errors with detailed messages."""
        errors = exc.errors()
        messages = []
        
        for err in errors:
            loc = ".".join(str(part) for part in err["loc"][1:])
            msg = err["msg"]
            messages.append(f"{loc}: {msg}")
        
        main_message = (
            f"Validation failed: {messages[0]}" 
            if messages 
            else "Validation failed"
        )

        response = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "code": "VALIDATION_ERROR",
                "message": main_message,
                "data": {"details": messages},
            },
        )
        return _attach_cors_headers(response, request)

    @app.exception_handler(BaseAppException)
    async def app_exception_handler(
        request: Request,
        exc: BaseAppException,
    ) -> JSONResponse:
        """Handle application-specific exceptions."""
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "code": exc.code,
                "message": exc.message,
                "data": exc.params,
            },
        )
        return _attach_cors_headers(response, request)

    @app.exception_handler(Exception)
    async def catch_all_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Handle unexpected exceptions with proper logging."""
        logger.error(
            "unhandled_exception",
            error=str(exc),
            path=request.url.path,
            exc_info=True,
        )
        
        debug_mode = karag_settings.LOG_LEVEL.upper() == "DEBUG"
        
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "data": {"detail": str(exc)} if debug_mode else None,
            },
        )
        return _attach_cors_headers(response, request)


def _setup_middleware(app: FastAPI) -> None:
    """
    Configure middleware stack.
    
    Order matters: middleware is executed in reverse order of addition,
    so the last added middleware wraps the request first.
    
    Args:
        app: The FastAPI application instance
    """
    # Security headers middleware - innermost for all responses
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Observability middleware: correlation IDs, structured logging, Prometheus metrics
    app.add_middleware(ObservabilityMiddleware)

    # Error handling middleware: structured error responses
    # Needs access to correlation ID from observability
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    app.add_middleware(ErrorHandlerMiddleware, debug=debug_mode)

    # CORS middleware - outermost layer to handle all requests/responses
    app.add_middleware(
        CORSMiddleware,
        allow_origins=karag_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID", "X-Request-ID"],
    )


def _setup_routes(app: FastAPI) -> None:
    """
    Configure API routes.
    
    Args:
        app: The FastAPI application instance
    """
    logger.info("router_init", msg="Including API routers...")

    # Add optional prefix support for Vercel/Proxy environments
    api_prefix = os.getenv("API_PREFIX", "")
    app.include_router(api_v1_router, prefix=api_prefix)

    logger.info(
        "router_init_complete",
        msg=f"API routers included with prefix: '{api_prefix}'",
    )

    # Health check endpoint
    @app.get(
        "/",
        response_model=HealthCheckResponse,
        tags=["health"],
        summary="Health check",
        description="Returns the current status of the API.",
    )
    async def health_check() -> dict[str, str]:
        """Health check endpoint for monitoring and load balancers."""
        return {
            "status": "online",
            "message": "Karag API is running",
            "version": AppMetadata.VERSION,
            "environment": os.getenv("ENVIRONMENT", "development"),
        }

    # Prometheus metrics endpoint
    if karag_settings.METRICS_ENABLED:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

        @app.get(
            "/metrics",
            tags=["observability"],
            include_in_schema=False,
            summary="Prometheus metrics",
        )
        async def metrics() -> JSONResponse:
            """Prometheus-compatible metrics endpoint for monitoring."""
            return JSONResponse(
                content=generate_latest().decode("utf-8"),
                media_type=CONTENT_TYPE_LATEST,
            )


def create_app() -> FastAPI:
    """
    Application factory function.
    
    Creates and configures the FastAPI application with all middleware,
    routes, and exception handlers.
    
    Returns:
        Configured FastAPI application instance
    """
    logger.info("app_init_start", msg="Initializing FastAPI app...")

    app = FastAPI(
        title=AppMetadata.TITLE,
        description=AppMetadata.DESCRIPTION,
        version=AppMetadata.VERSION,
        lifespan=lifespan,
        contact=AppMetadata.CONTACT,
        license_info=AppMetadata.LICENSE_INFO,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    _setup_middleware(app)
    _setup_exception_handlers(app)
    _setup_routes(app)

    logger.info("app_init_complete", msg="FastAPI app initialized successfully")

    return app


# Create the application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=karag_settings.BACKEND_HOST,
        port=karag_settings.BACKEND_PORT,
        reload=True,
        log_level=karag_settings.LOG_LEVEL.lower(),
    )
