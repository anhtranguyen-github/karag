import asyncio
import uuid
from datetime import datetime
from typing import Any

import structlog
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.graph.builder import app as graph_app
from src.backend.app.providers.llm import get_llm
from src.backend.app.schemas.eval import (
    EvalDataset,
    EvalResult,
    EvalRun,
    EvalStatus,
    TestCase,
)
from langchain_core.messages import HumanMessage

logger = structlog.get_logger(__name__)


class EvalService:
    async def create_dataset(self, name: str, workspace_id: str, test_cases: list[dict[str, Any]]) -> str:
        db = mongodb_manager.get_async_database()
        dataset_id = str(uuid.uuid4())
        dataset = EvalDataset(
            id=dataset_id,
            name=name,
            workspace_id=workspace_id,
            test_cases=[TestCase(**tc) for tc in test_cases],
            created_at=datetime.utcnow(),
        )
        await db.eval_datasets.insert_one(dataset.dict())
        return dataset_id

    async def list_datasets(self, workspace_id: str) -> list[dict[str, Any]]:
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
            started_at=datetime.utcnow(),
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
                    "workspace_id": dataset.workspace_id,
                }

                output = await graph_app.ainvoke(input_state, config=config)

                actual_answer = output["messages"][-1].content
                # Context is usually stored in the state
                sources = output.get("sources", [])
                actual_source_ids = [s["name"] for s in sources]
                context_texts = [s.get("content", "") for s in sources]
                full_context = "\n\n".join(context_texts)

                # 2. LLM-as-a-Judge: Faithfulness (Faithfulness Check)
                from src.backend.app.core.prompt_manager import prompt_manager

                eval_llm = await get_llm(dataset.workspace_id)

                faith_sys = prompt_manager.get_prompt("evaluator.faithfulness.system", version="v1")
                faith_user = prompt_manager.format_prompt(
                    prompt_manager.get_prompt("evaluator.faithfulness.user", version="v1"),
                    context=full_context[:4000],  # Cap context for eval
                    answer=actual_answer,
                )

                faith_resp = await eval_llm.ainvoke([HumanMessage(content=f"{faith_sys}\n\n{faith_user}")])

                try:
                    faith_score = float(faith_resp.content.strip())
                except ValueError:
                    faith_score = 0.5  # Fallback on parse error

                # 3. Aggregate Metrics
                metrics = {
                    "retrieval_count": float(len(actual_source_ids)),
                    "answer_length": float(len(actual_answer)),
                    "faithfulness": faith_score,
                }

                results.append(
                    EvalResult(
                        test_case=test_case,
                        actual_answer=actual_answer,
                        actual_source_ids=actual_source_ids,
                        metrics=metrics,
                        success=faith_score > 0.7,
                    )
                )

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
                        "completed_at": datetime.utcnow(),
                    }
                },
            )
        except Exception as e:
            logger.error("eval_run_failed", run_id=run_id, error=str(e), exc_info=True)
            await db.eval_runs.update_one({"id": run_id}, {"$set": {"status": EvalStatus.FAILED}})

    async def get_run(self, run_id: str) -> dict[str, Any] | None:
        db = mongodb_manager.get_async_database()
        return await db.eval_runs.find_one({"id": run_id})

    async def list_runs(self, workspace_id: str) -> list[dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        cursor = db.eval_runs.find({"workspace_id": workspace_id}).sort("started_at", -1)
        return await cursor.to_list(length=100)


eval_service = EvalService()

