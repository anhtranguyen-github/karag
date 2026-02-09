import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.app.api.v1 import api_v1_router
from backend.app.core.config import ai_settings
from backend.app.core.exceptions import BaseAppException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.app.core.minio import minio_manager
    from backend.app.rag.qdrant_provider import qdrant
    from backend.app.services.workspace_service import workspace_service
    
    logger.info("Initializing Infrastructure...")
    minio_manager.ensure_bucket()
    # Ensure default collections exist (1536 for OpenAI/Deep, 768 for Local/Fast)
    await qdrant.create_collection("knowledge_base_1536", 1536)
    await qdrant.create_collection("knowledge_base_768", 768)
    await qdrant.create_collection("knowledge_base_896", 896) # Qwen series
    await qdrant.create_collection("knowledge_base_1024", 1024) # Multilingual-E5, etc.
    
    # Ensure default workspace exists
    logger.info("Ensuring default workspace...")
    await workspace_service.ensure_default_workspace()
    
    logger.info("Infrastructure ready.")
    yield

def create_app() -> FastAPI:
    logger.info("Initializing FastAPI app...")
    app = FastAPI(
        title="Knowledge Bank API",
        description="Modular RAG & Agentic Chatbot API",
        version="2.0.0",
        lifespan=lifespan
    )

    # CORS Setup
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Roots
    @app.get("/", tags=["health"])
    async def root():
        return {
            "status": "online",
            "message": "Knowledge Bank API is running",
            "version": "2.0.0"
        }

    # Include modular routes
    logger.info("Including API routers...")
    app.include_router(api_v1_router)
    logger.info("API routers included.")

    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "detail": exc.message,
                "params": exc.params
            }
        )

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app", 
        host="0.0.0.0", 
        port=ai_settings.BACKEND_PORT,
        reload=False
    )
