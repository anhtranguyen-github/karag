from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    api_keys,
    organizations,
    observability,
    workspaces,
    auth,
    documents,
    chat,
    evaluation_datasets,
)

api_router = APIRouter()

api_router.include_router(api_keys.router)
api_router.include_router(organizations.router)
api_router.include_router(observability.router)
api_router.include_router(workspaces.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(evaluation_datasets.router)
