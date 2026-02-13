from fastapi import APIRouter, Request, BackgroundTasks
from backend.app.services.eval_service import eval_service
from backend.app.schemas.base import AppResponse
from typing import List, Dict, Any

router = APIRouter()

@router.post("/datasets")
async def create_dataset(request: Request, workspace_id: str = "default"):
    data = await request.json()
    name = data.get("name")
    test_cases = data.get("test_cases", [])
    
    dataset_id = await eval_service.create_dataset(name, workspace_id, test_cases)
    return AppResponse.success_response(data={"dataset_id": dataset_id})

@router.get("/datasets")
async def list_datasets(workspace_id: str = "default"):
    datasets = await eval_service.list_datasets(workspace_id)
    return AppResponse.success_response(data=datasets)

@router.post("/runs")
async def run_evaluation(request: Request, workspace_id: str = "default"):
    data = await request.json()
    dataset_id = data.get("dataset_id")
    
    run_id = await eval_service.run_evaluation(dataset_id, workspace_id)
    return AppResponse.success_response(data={"run_id": run_id})

@router.get("/runs")
async def list_runs(workspace_id: str = "default"):
    runs = await eval_service.list_runs(workspace_id)
    return AppResponse.success_response(data=runs)

@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = await eval_service.get_run(run_id)
    if not run:
        return AppResponse.business_failure(code="NOT_FOUND", message="Eval run not found")
    # MongoDB _id is not serializable
    if "_id" in run:
        del run["_id"]
    return AppResponse.success_response(data=run)
