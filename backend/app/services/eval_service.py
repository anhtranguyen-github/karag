import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

import structlog
from backend.app.core.mongodb import mongodb_manager
from backend.app.schemas.eval import EvalDataset, EvalRun, EvalStatus, EvalResult, TestCase
from backend.app.rag.rag_service import rag_service
from backend.app.providers.llm import get_llm
from backend.app.graph.builder import app as graph_app
from langchain_core.messages import HumanMessage

logger = structlog.get_logger(__name__)

class EvalService:
    async def create_dataset(self, name: str, workspace_id: str, test_cases: List[Dict[str, Any]]) -> str:
        db = mongodb_manager.get_async_database()
        dataset_id = str(uuid.uuid4())
        dataset = EvalDataset(
            id=dataset_id,
            name=name,
            workspace_id=workspace_id,
            test_cases=[TestCase(**tc) for tc in test_cases],
            created_at=datetime.utcnow()
        )
        await db.eval_datasets.insert_one(dataset.dict())
        return dataset_id

    async def list_datasets(self, workspace_id: str) -> List[Dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        cursor = db.eval_datasets.find({"workspace_id": workspace_id})
        return await cursor.to_list(length=100)

    async def run_evaluation(self, dataset_id: str, workspace_id: str) -> str:
        db = mongodb_manager.get_async_database()
        dataset_doc = await db.eval_datasets.find_one({"id": dataset_id})
        if not dataset_doc:
            raise ValueError("Dataset not found")
        
        dataset = EvalDataset(**dataset_doc)
        run_id = str(uuid.uuid4())
        
        run = EvalRun(
            id=run_id,
            dataset_id=dataset_id,
            workspace_id=workspace_id,
            status=EvalStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        await db.eval_runs.insert_one(run.dict())
        
        # Start background task
        asyncio.create_task(self._execute_run(run_id, dataset))
        
        return run_id

    async def _execute_run(self, run_id: str, dataset: EvalDataset):
        db = mongodb_manager.get_async_database()
        results = []
        
        try:
            for test_case in dataset.test_cases:
                # 1. Run RAG
                # We can use the graph_app to get the full reasoning + answer
                config = {"configurable": {"thread_id": f"eval_{run_id}_{uuid.uuid4()}"}}
                input_state = {
                    "messages": [HumanMessage(content=test_case.query)],
                    "workspace_id": dataset.workspace_id
                }
                
                output = await graph_app.ainvoke(input_state, config=config)
                
                actual_answer = output["messages"][-1].content
                # Context is usually stored in the state
                actual_sources = [s["name"] for s in output.get("sources", [])]
                
                # 2. Simple Metrics (for now)
                # Later we can add LLM-as-a-judge here
                metrics = {
                    "retrieval_count": float(len(actual_sources)),
                    "answer_length": float(len(actual_answer))
                }
                
                results.append(EvalResult(
                    test_case=test_case,
                    actual_answer=actual_answer,
                    actual_source_ids=actual_sources,
                    metrics=metrics,
                    success=True
                ))
            
            # Summary metrics
            avg_metrics = {}
            if results:
                for res in results:
                    for k, v in res.metrics.items():
                        avg_metrics[k] = avg_metrics.get(k, 0) + v
                for k in avg_metrics:
                    avg_metrics[k] /= len(results)

            await db.eval_runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "status": EvalStatus.COMPLETED,
                        "results": [res.dict() for res in results],
                        "overall_metrics": avg_metrics,
                        "completed_at": datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            logger.error("eval_run_failed", run_id=run_id, error=str(e), exc_info=True)
            await db.eval_runs.update_one(
                {"id": run_id},
                {"$set": {"status": EvalStatus.FAILED}}
            )

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        return await db.eval_runs.find_one({"id": run_id})

    async def list_runs(self, workspace_id: str) -> List[Dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        cursor = db.eval_runs.find({"workspace_id": workspace_id}).sort("started_at", -1)
        return await cursor.to_list(length=100)

eval_service = EvalService()
