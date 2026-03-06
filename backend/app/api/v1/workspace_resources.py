from typing import List, Optional, Literal
from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.schemas.base import AppResponse
from backend.app.api.deps import get_current_user, get_current_workspace, CurrentUser, CurrentWorkspace
from backend.app.schemas.dataset import Dataset
from backend.app.schemas.pipeline import PipelineConfig
from backend.app.services.dataset_service import dataset_service

# Assuming we're attaching this router directly or importing into main
router = APIRouter(tags=["workspace-resources"])

@router.get("/datasets", response_model=AppResponse[List[Dataset]])
async def list_datasets(
    workspace_id: str,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    """List all datasets in a workspace."""
    datasets = await dataset_service.list_workspace_datasets(workspace_id)
    return AppResponse.success_response(data=datasets)

class DatasetCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

@router.post("/datasets", response_model=AppResponse[Dataset])
async def create_dataset(
    workspace_id: str,
    data: DatasetCreate,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    """Create a new dataset in a workspace."""
    dataset = await dataset_service.create_workspace_dataset(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description
    )
    return AppResponse.success_response(data=dataset)

@router.get("/datasets/{dataset_id}", response_model=AppResponse[Dataset])
async def get_dataset(
    workspace_id: str,
    dataset_id: str,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    """Get dataset by ID."""
    dataset = await dataset_service.get_dataset(dataset_id=dataset_id, workspace_id=workspace_id)
    return AppResponse.success_response(data=dataset)

@router.delete("/datasets/{dataset_id}", response_model=AppResponse[bool])
async def delete_dataset(
    workspace_id: str,
    dataset_id: str,
    delete_contents: bool = False,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    """Delete a dataset from the workspace."""
    success = await dataset_service.delete_dataset(
        dataset_id=dataset_id,
        workspace_id=workspace_id,
        delete_contents=delete_contents
    )
    return AppResponse.success_response(data=success, message=f"Dataset {dataset_id} deleted")

@router.get("/pipelines", response_model=AppResponse[List[PipelineConfig]])
async def list_pipelines(
    workspace_id: str,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    """List pipeline configs for workspace. (Mock implementation for now)"""
    # In a full implementation, PipelineConfigs would be stored in the DB alongside settings
    from backend.app.core.settings_manager import settings_manager
    # We return an empty list or a default pipeline built from workspace config
    return AppResponse.success_response(data=[])
