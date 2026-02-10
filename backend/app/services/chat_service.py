import json
import asyncio
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Optional

import structlog
from langchain_core.messages import HumanMessage
from backend.app.graph.builder import app as graph_app
from backend.app.core.mongodb import mongodb_manager
from backend.app.providers.llm import get_llm
from backend.app.core.settings_manager import settings_manager
from backend.app.core.telemetry import (
    get_tracer,
    ACTIVE_STREAMS,
    LLM_REQUEST_LATENCY,
    LLM_REQUEST_COUNT,
)

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class ChatService:
    @staticmethod
    async def get_history(thread_id: str) -> List[Dict]:
        """Fetch the chat history for a specific thread."""
        with tracer.start_as_current_span(
            "chat.get_history",
            attributes={"thread_id": thread_id},
        ):
            config = {"configurable": {"thread_id": thread_id}}
            state = await graph_app.aget_state(config)

            if not state or "messages" not in state.values:
                return []

            history = []
            for msg in state.values["messages"]:
                msg_data = {
                    "role": "user" if msg.type == "human" else "assistant",
                    "content": msg.content,
                    "id": getattr(msg, "id", None),
                }
                if hasattr(msg, "additional_kwargs"):
                    if "reasoning_steps" in msg.additional_kwargs:
                        msg_data["reasoning_steps"] = msg.additional_kwargs[
                            "reasoning_steps"
                        ]
                    if "sources" in msg.additional_kwargs:
                        msg_data["sources"] = msg.additional_kwargs["sources"]
                history.append(msg_data)
            return history

    @staticmethod
    async def list_threads(workspace_id: str = "default") -> List[Dict]:
        """List all available chat threads for a workspace."""
        with tracer.start_as_current_span(
            "chat.list_threads",
            attributes={"workspace_id": workspace_id},
        ):
            db = mongodb_manager.get_async_database()
            checkpoints_col = db["checkpoints"]
            metadata_col = db["thread_metadata"]

            workspace_threads = await metadata_col.find(
                {"workspace_id": workspace_id}
            ).to_list(None)
            thread_ids = [doc["thread_id"] for doc in workspace_threads]

            pipeline = [
                {"$match": {"thread_id": {"$in": thread_ids}}},
                {"$sort": {"_id": -1}},
                {
                    "$group": {
                        "_id": "$thread_id",
                        "last_active": {"$first": "$_id"},
                    }
                },
                {"$sort": {"last_active": -1}},
            ]

            results = await checkpoints_col.aggregate(pipeline).to_list(None)
            sorted_thread_ids = [res["_id"] for res in results]
            meta_map = {doc["thread_id"]: doc for doc in workspace_threads}

            return [
                {
                    "id": tid,
                    "title": meta_map.get(tid, {}).get("title", f"Chat {tid[:8]}"),
                    "has_thinking": meta_map.get(tid, {}).get("has_thinking", False),
                    "tags": meta_map.get(tid, {}).get("tags", []),
                }
                for tid in sorted_thread_ids
            ]

    @staticmethod
    async def update_title(thread_id: str, title: str):
        """Update the title of a specific thread."""
        db = mongodb_manager.get_async_database()
        await db["thread_metadata"].update_one(
            {"thread_id": thread_id}, {"$set": {"title": title}}, upsert=True
        )

    @staticmethod
    async def delete_thread(thread_id: str):
        """Delete a thread and its history."""
        with tracer.start_as_current_span(
            "chat.delete_thread",
            attributes={"thread_id": thread_id},
        ):
            db = mongodb_manager.get_async_database()
            await db["checkpoints"].delete_many({"thread_id": thread_id})
            await db["thread_metadata"].delete_one({"thread_id": thread_id})
            logger.info("chat_thread_deleted", thread_id=thread_id)

    @staticmethod
    async def generate_title(
        message: str, thread_id: str, workspace_id: str = "default"
    ):
        """Automatically generate a title and metadata tags for a new thread."""
        with tracer.start_as_current_span(
            "chat.generate_title",
            attributes={
                "thread_id": thread_id,
                "workspace_id": workspace_id,
            },
        ):
            try:
                db = mongodb_manager.get_async_database()
                col = db["thread_metadata"]
                if await col.find_one(
                    {"thread_id": thread_id, "title": {"$exists": True}}
                ):
                    return

                llm = await get_llm(workspace_id)
                prompt = (
                    f"Analyze the following user message and provide a catchy title (2-4 words) "
                    f"and up to 5 relevant short tags for categorization. "
                    f"Return ONLY a valid JSON object with keys 'title' (string) and 'tags' (list of strings).\n"
                    f"Message: {message}"
                )

                response = await llm.ainvoke(prompt)
                content = response.content.strip()

                if content.startswith("```json"):
                    content = content[7:-3].strip()
                elif content.startswith("```"):
                    content = content[3:-3].strip()

                try:
                    data = json.loads(content)
                    title = data.get("title", f"Chat {thread_id[:8]}")
                    tags = data.get("tags", [])[:5]
                except Exception:
                    title = content.split("\n")[0][:50]
                    tags = []

                await col.update_one(
                    {"thread_id": thread_id},
                    {
                        "$set": {
                            "title": title,
                            "tags": tags,
                            "workspace_id": workspace_id,
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                    },
                    upsert=True,
                )
                logger.info(
                    "chat_title_generated",
                    thread_id=thread_id,
                    title=title,
                    tags=tags,
                )
            except Exception as e:
                logger.error(
                    "chat_title_generation_failed",
                    thread_id=thread_id,
                    error=str(e),
                )

    @staticmethod
    async def stream_updates(
        message: str, thread_id: str, workspace_id: str
    ) -> AsyncGenerator[str, None]:
        """Stream event updates from the LangGraph execution with robust error handling."""
        inputs = {
            "messages": [HumanMessage(content=message)],
            "workspace_id": workspace_id,
        }
        config = {"configurable": {"thread_id": thread_id}}

        # Track active streams for saturation monitoring
        ACTIVE_STREAMS.inc()
        span = tracer.start_span(
            "chat.stream",
            attributes={
                "thread_id": thread_id,
                "workspace_id": workspace_id,
                "message_preview": message[:80],
            },
        )

        try:
            async for event in graph_app.astream_events(
                inputs, config=config, version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "")

                try:
                    if kind == "on_chain_end" and name in [
                        "retrieve",
                        "reason",
                        "generate",
                    ]:
                        output = event["data"].get("output", {})
                        if isinstance(output, dict):
                            settings = await settings_manager.get_settings(
                                workspace_id
                            )
                            if (
                                settings.show_reasoning
                                and "reasoning_steps" in output
                            ):
                                db = mongodb_manager.get_async_database()
                                await db["thread_metadata"].update_one(
                                    {"thread_id": thread_id},
                                    {"$set": {"has_thinking": True}},
                                )
                                yield f"data: {json.dumps({'type': 'reasoning', 'steps': output['reasoning_steps']})}\n\n"
                            if "sources" in output:
                                yield f"data: {json.dumps({'type': 'sources', 'sources': output['sources']})}\n\n"

                    if kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"
                    elif kind == "on_tool_start":
                        yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
                    elif kind == "on_tool_end":
                        yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name'], 'output': event['data'].get('output')})}\n\n"
                except Exception as inner_e:
                    logger.error(
                        "chat_stream_event_error",
                        event_kind=kind,
                        error=str(inner_e),
                    )
                    continue

        except Exception as e:
            logger.error(
                "chat_stream_failed",
                thread_id=thread_id,
                error=str(e),
                exc_info=True,
            )
            from opentelemetry.trace import StatusCode

            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Connection to reasoning engine lost'})}\n\n"
        finally:
            ACTIVE_STREAMS.dec()
            span.end()


chat_service = ChatService()
