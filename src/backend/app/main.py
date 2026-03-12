from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
import json
import logging
from app.realtime.websocket.handlers.file_upload_handler import FileUploadHandler

logger = logging.getLogger(__name__)

from app.core.config import PlatformSettings
from app.core.logging import configure_logging
from app.karag_manager import KaragManager
from app.api.v1.middlewares.security import SecurityHeadersMiddleware
from app.api.v1.middlewares.logging import RequestLoggingMiddleware
from app.api.v1.middlewares.rate_limit import RedisRateLimiterMiddleware
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



    @app.get("/health/dependencies")
    def dependency_health(request: Request) -> dict[str, object]:
        karag_manager: KaragManager = request.app.state.karag_manager
        return karag_manager.health_report()

    from app.api.v1.routers.api import api_router as api_v1_router
    app.include_router(api_v1_router, prefix="/api/v1")

    from app.api.v1.endpoints.runtime import router as runtime_router
    app.include_router(runtime_router)

    @app.websocket("/ws")
    async def global_websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        karag_manager: KaragManager = app.state.karag_manager
        upload_handler = FileUploadHandler(karag_manager)
        try:
            while True:
                message = await websocket.receive_text()
                # Process the message and respond back for acknowledgement.
                response = await upload_handler.handle_message(context=None, message=message)
                await websocket.send_text(json.dumps(response))
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.exception("WebSocket error in global handler: %s", e)

    @app.websocket("/ws/uploads/{upload_id}")
    async def websocket_endpoint(websocket: WebSocket, upload_id: str):
        await websocket.accept()
        karag_manager: KaragManager = app.state.karag_manager
        await karag_manager.ws_manager.register(upload_id, websocket)
        try:
            while True:
                # Keep connection alive; ignore incoming messages for now
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            await karag_manager.ws_manager.unregister(upload_id, websocket)
    
    return app


app = create_app()
