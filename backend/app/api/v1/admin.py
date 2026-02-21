from fastapi import APIRouter
from backend.app.core.prompt_manager import prompt_manager
from backend.app.schemas.base import AppResponse

router = APIRouter(prefix="/admin", tags=["Admin & Ops"])


@router.get("/prompts")
async def get_prompts():
    """List all prompts in the registry."""
    return AppResponse.success_response(data=prompt_manager.get_all_prompts())


@router.get("/vector/status")
async def get_vector_status():
    """Get status of the vector store."""
    from backend.app.core.factory import LangChainFactory
    store = await LangChainFactory.get_vector_store()
    status = await store.get_system_info()
    return AppResponse.success_response(data=status)


@router.get("/ops/overview")
async def get_ops_overview():
    """Get a high-level overview of system components."""
    # This could be expanded with more health checks
    return AppResponse.success_response(
        data={
            "version": "1.0.0",
            "services": {
                "prompt_registry": "healthy",
                "vector_store": "healthy",
                "telemetry": "active",
            },
        }
    )
