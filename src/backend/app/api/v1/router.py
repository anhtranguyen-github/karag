from fastapi import APIRouter
from src.backend.app.api.v1 import (
    admin,
    auth,
    baas_admin,
    chat,
    completions,
    documents,
    embeddings,
    eval,
    files,
    search,
    settings,
    tasks,
    workspace_resources,
    workspaces,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router)
api_v1_router.include_router(workspaces.router)
api_v1_router.include_router(completions.router)
api_v1_router.include_router(embeddings.router)
api_v1_router.include_router(files.router)

# BaaS Admin routes (Blocks 1-5)
api_v1_router.include_router(baas_admin.router)

# Workspace-scoped routes
ws_router = APIRouter(prefix="/workspaces/{workspace_id}")
ws_router.include_router(chat.router, prefix="/chat")
ws_router.include_router(workspace_resources.router)
ws_router.include_router(documents.router)
ws_router.include_router(search.router, prefix="/search")
ws_router.include_router(tasks.router, prefix="/tasks")
ws_router.include_router(settings.router, prefix="/settings")

api_v1_router.include_router(ws_router)
api_v1_router.include_router(eval.router, prefix="/eval", tags=["Evaluation"])
api_v1_router.include_router(admin.router)
