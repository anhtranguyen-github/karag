from fastapi import APIRouter
from backend.app.api.v1 import (
    chat,
    documents,
    workspaces,
    settings,
    search,
    tasks,
    eval,
    admin,
)

api_v1_router = APIRouter()

api_v1_router.include_router(chat.router)
api_v1_router.include_router(documents.router)
api_v1_router.include_router(workspaces.router)
api_v1_router.include_router(settings.router)
api_v1_router.include_router(search.router)
api_v1_router.include_router(tasks.router)
api_v1_router.include_router(eval.router, prefix="/eval", tags=["Evaluation"])
api_v1_router.include_router(admin.router)
