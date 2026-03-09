from __future__ import annotations

from fastapi import APIRouter, Request
import httpx
from fastapi import HTTPException

router = APIRouter(prefix="/api/v1/providers", tags=["providers"])


@router.get("", response_model=dict)
def list_providers(request: Request) -> dict:
    """Return available provider plugin keys for the UI.

    Response includes storage_providers, vector_stores, llm_providers and
    embedding_providers as lists of provider keys.
    """
    container = request.app.state.container
    return {
        "storage_providers": container.storage_providers.names(),
        "vector_stores": container.vector_stores.names(),
        "llm_providers": container.llm_providers.names(),
        "embedding_providers": container.embedding_providers.names(),
    }



@router.get("/vllm/health")
def vllm_health(request: Request) -> dict:
    """Proxy vLLM /health for the frontend to poll/warm.

    Returns `{status: 'ok'}` when reachable, otherwise raises 503.
    """
    container = request.app.state.container
    base = container.settings.vllm_base_url.rstrip("/")
    url = f"{base}/health"
    try:
        resp = httpx.get(url, timeout=5.0)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"vLLM unreachable: {exc}")
    if resp.status_code != 200:
        raise HTTPException(status_code=503, detail=f"vLLM health returned {resp.status_code}")
    return resp.json()
