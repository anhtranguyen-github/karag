import json
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Optional, Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from backend.app.graph.builder import app as graph_app
from backend.app.core.mongodb import mongodb_manager
from backend.app.providers.llm import get_llm
from backend.app.core.settings_manager import settings_manager
from backend.app.core.telemetry import (
    get_tracer,
    ACTIVE_STREAMS,
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
            # First try LangGraph checkpoint (for non-execution path)
            config = {"configurable": {"thread_id": thread_id}}
            state = await graph_app.aget_state(config)

            if state and "messages" in state.values and state.values["messages"]:
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

            # Fallback: read from chat_messages collection (for execution/RAG path)
            db = mongodb_manager.get_async_database()
            msg_col = db["chat_messages"]
            docs = await msg_col.find(
                {"thread_id": thread_id},
                {"_id": 0, "thread_id": 0}
            ).sort("created_at", 1).to_list(None)
            
            if docs:
                history = []
                for i, doc in enumerate(docs):
                    msg_data = {
                        "role": doc.get("role", "user"),
                        "content": doc.get("content", ""),
                        "id": str(doc.get("_id", f"msg-{i}")),
                    }
                    if "reasoning_steps" in doc:
                        msg_data["reasoning_steps"] = doc["reasoning_steps"]
                    if "sources" in doc:
                        msg_data["sources"] = doc["sources"]
                    history.append(msg_data)
                return history

            return []

    @staticmethod
    async def list_threads(workspace_id: str = "vault") -> List[Dict]:
        """List all available chat threads for a workspace."""
        with tracer.start_as_current_span(
            "chat.list_threads",
            attributes={"workspace_id": workspace_id},
        ):
            db = mongodb_manager.get_async_database()
            metadata_col = db["thread_metadata"]

            # Sort by updated_at descending, fallback to _id
            workspace_threads = await metadata_col.find(
                {"workspace_id": workspace_id}
            ).sort([("updated_at", -1), ("_id", -1)]).to_list(None)

            return [
                {
                    "id": doc["thread_id"],
                    "title": doc.get("title", "New chat"),
                    "has_thinking": doc.get("has_thinking", False),
                    "tags": doc.get("tags", []),
                    "updated_at": doc.get("updated_at"),
                }
                for doc in workspace_threads
            ]

    @staticmethod
    async def get_thread(thread_id: str) -> Dict:
        """Fetch metadata for a specific thread."""
        db = mongodb_manager.get_async_database()
        meta = await db["thread_metadata"].find_one({"thread_id": thread_id})
        if not meta:
            return {
                "id": thread_id,
                "title": "New chat",
                "workspace_id": "vault",
            }
        return {
            "id": thread_id,
            "title": meta.get("title", "New chat"),
            "workspace_id": meta.get("workspace_id", "vault"),
            "has_thinking": meta.get("has_thinking", False),
            "tags": meta.get("tags", []),
        }

    @staticmethod
    async def update_title(thread_id: str, title: str):
        """Update the title of a specific thread."""
        db = mongodb_manager.get_async_database()
        await db["thread_metadata"].update_one(
            {"thread_id": thread_id}, {"$set": {"title": title}}, upsert=True
        )

    @staticmethod
    async def delete_thread(thread_id: str):
        """Delete a thread and its history across all collections."""
        with tracer.start_as_current_span(
            "chat.delete_thread",
            attributes={"thread_id": thread_id},
        ):
            db = mongodb_manager.get_async_database()
            # Clean up all possible storage locations
            await db["checkpoints"].delete_many({"thread_id": thread_id})
            await db["checkpoint_writes"].delete_many({"thread_id": thread_id})
            await db["chat_messages"].delete_many({"thread_id": thread_id})
            await db["thread_metadata"].delete_one({"thread_id": thread_id})
            logger.info("chat_thread_deleted", thread_id=thread_id)

    @staticmethod
    async def generate_title(
        message: str, thread_id: str, workspace_id: str = "vault"
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
                history = await ChatService.get_history(thread_id)
                db_meta = await col.find_one({"thread_id": thread_id})
                logger.info("generate_title_check", thread_id=thread_id, history_len=len(history), has_meta=db_meta is not None, current_title=db_meta.get("title") if db_meta else None)

                # If we have less than 5 messages, just ensure it's "New chat"
                if len(history) < 5:
                    if len(history) >= 1 and (not db_meta or "title" not in db_meta):
                        await col.update_one(
                            {"thread_id": thread_id},
                            {
                                "$set": {
                                    "title": "New chat", 
                                    "workspace_id": workspace_id,
                                    "updated_at": datetime.utcnow().isoformat()
                                }
                            },
                            upsert=True
                        )
                    elif db_meta:
                        # Even if we don't change title, update the timestamp
                        await col.update_one(
                            {"thread_id": thread_id},
                            {"$set": {"updated_at": datetime.utcnow().isoformat()}}
                        )
                    logger.info("generate_title_skipped", reason="under_5_messages", count=len(history))
                    return

                # If we have >= 5 messages, we generate if title is missing or still "New chat"
                if db_meta and "title" in db_meta and db_meta["title"] != "New chat":
                    logger.info("generate_title_skipped", reason="already_has_title", title=db_meta["title"])
                    return
                
                logger.info("generate_title_proceeding", thread_id=thread_id)

                from backend.app.core.prompt_manager import prompt_manager

                sys_tem = prompt_manager.get_prompt(
                    "title_generator.system", version="v1"
                )
                user_msg = prompt_manager.format_prompt(
                    prompt_manager.get_prompt("title_generator.user", version="v1"),
                    message=message,
                )

                llm = await get_llm(workspace_id)
                response = await llm.ainvoke(
                    [SystemMessage(content=sys_tem), HumanMessage(content=user_msg)]
                )

                # Record usage
                usage = getattr(response, "usage_metadata", {})
                if usage:
                    from backend.app.core.telemetry import record_llm_usage

                    record_llm_usage(
                        provider=type(llm).__name__,
                        model=getattr(
                            llm, "model_name", getattr(llm, "model", "unknown")
                        ),
                        prompt_tokens=usage.get("input_tokens", 0),
                        completion_tokens=usage.get("output_tokens", 0),
                        workspace_id=workspace_id,
                    )
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
        message: str,
        thread_id: str,
        workspace_id: str,
        execution: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream event updates from the LangGraph execution with robust error handling."""
        logger.info(
            "stream_updates_entered",
            workspace_id=workspace_id,
            thread_id=thread_id,
            execution=execution,
        )

        # Track active streams
        ACTIVE_STREAMS.inc()
        span = tracer.start_span(
            "chat.stream",
            attributes={
                "thread_id": thread_id,
                "workspace_id": workspace_id,
                "message_preview": message[:80],
                "has_execution_config": execution is not None,
            },
        )

        try:
            # Ensure thread metadata exists immediately so it shows up in the sidebar
            db = mongodb_manager.get_async_database()
            await db["thread_metadata"].update_one(
                {"thread_id": thread_id},
                {
                    "$set": {
                        "workspace_id": workspace_id,
                        "updated_at": datetime.utcnow().isoformat()
                    },
                    "$setOnInsert": {"title": "New chat"}
                },
                upsert=True
            )

            if execution:
                # Use the new LangGraph-based adaptive RAG execution
                from backend.app.rag.graph.orchestrator import rag_executor
                from backend.app.schemas.execution import RuntimeSettings

                settings = RuntimeSettings(**execution)
                initial_state = {
                    "query": message,
                    "workspace_id": workspace_id,
                    "settings": settings,
                    "generated_queries": [],
                    "retrieved_results": [],
                    "draft_answers": [],
                    "loop_count": 0,
                    "confidence_level": 0.0,
                    "is_sufficient": False,
                    "execution_metadata": {"nodes_visited": []},
                }

                collected_sources = []
                collected_reasoning = []
                collected_content = []
                stream_error = None

                try:
                    async for event in rag_executor.astream_events(
                        initial_state, version="v2"
                    ):
                        kind = event["event"]
                        node_name = event.get("name", "")

                        if kind == "on_chain_start":
                            # Map internal node names to user-friendly "Thinking" steps
                            display_names = {
                                "analyze": "Analyzing inquiry intent...",
                                "build_query": "Generating optimized search paths...",
                                "retrieve": "Searching knowledge base...",
                                "blend": "Combining retrieved context...",
                                "reflect": "Verifying information sufficiency...",
                                "assemble": "Preparing final response context...",
                                "generate": "Reasoning and drafting answer...",
                                "synthesize": "Finalizing comprehensive response...",
                            }
                            if node_name in display_names:
                                step_msg = display_names[node_name]
                                collected_reasoning.append(step_msg)
                                yield f"data: {json.dumps({'type': 'reasoning', 'steps': [step_msg]})}\n\n"

                        if kind == "on_chat_model_stream":
                            tags = event.get("tags", [])
                            # Only stream as main content if it's tagged as the final answer
                            if "final_answer" in tags:
                                content = event["data"]["chunk"].content
                                if content:
                                    collected_content.append(content)
                                    yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"

                        if kind == "on_chat_model_end":
                            tags = event.get("tags", [])
                            # Capture internal model logic as reasoning steps
                            if "reasoning" in tags:
                                content = event["data"]["output"].content
                                if content:
                                    # Truncate very long internal logic for better UI readability
                                    reason_msg = content[:400] + "..." if len(content) > 400 else content
                                    collected_reasoning.append(reason_msg)
                                    yield f"data: {json.dumps({'type': 'reasoning', 'steps': [reason_msg]})}\n\n"
                            
                            # Fallback for final answer if streaming didn't occur
                            if "final_answer" in tags and not collected_content:
                                content = event["data"]["output"].content
                                if content:
                                    collected_content.append(content)
                                    yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"

                        if kind == "on_chain_end":
                            output = event["data"].get("output", {})
                            
                            if node_name == "analyze":
                                intent = output.get("intent_analysis", "").strip()
                                if intent:
                                    msg = f"Inquiry Analysis: {intent}"
                                    collected_reasoning.append(msg)
                                    yield f"data: {json.dumps({'type': 'reasoning', 'steps': [msg]})}\n\n"
                                    
                            if node_name == "build_query":
                                queries = output.get("generated_queries", [])
                                if queries:
                                    msg = f"Research Plan: Searching for {', '.join(queries)}"
                                    collected_reasoning.append(msg)
                                    yield f"data: {json.dumps({'type': 'reasoning', 'steps': [msg]})}\n\n"

                            if node_name == "retrieve":
                                # Stream sources back to UI
                                results = output.get("retrieved_results", [])
                                if results:
                                    sources = [
                                        {
                                            "id": i + 1,
                                            "name": r.get("source", r.get("payload", {}).get("source", "Unknown")),
                                            "content": r.get("text", r.get("payload", {}).get("text", ""))
                                        }
                                        for i, r in enumerate(results)
                                    ]
                                    collected_sources = sources
                                    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
                                    
                                    msg = f"Knowledge Retrieval: Found {len(results)} relevant context fragments."
                                    collected_reasoning.append(msg)
                                    yield f"data: {json.dumps({'type': 'reasoning', 'steps': [msg]})}\n\n"

                            if node_name == "reflect":
                                sufficient = output.get("is_sufficient")
                                loop = output.get("loop_count", 1)
                                msg = f"Research Validation (Loop {loop}): {'Context is complete' if sufficient else 'Identifying missing gaps for further search'}."
                                collected_reasoning.append(msg)
                                yield f"data: {json.dumps({'type': 'reasoning', 'steps': [msg]})}\n\n"
                            
                            # Fallback harvesting for the final generation node if streaming didn't happen
                            if node_name in ["generate", "synthesize"] and not collected_content:
                                final = output.get("final_answer") or (output.get("draft_answers", [""])[0])
                                if final:
                                    collected_content.append(final)
                                    yield f"data: {json.dumps({'type': 'content', 'delta': final})}\n\n"

                            if isinstance(output, dict) and "execution_metadata" in output:
                                yield f"data: {json.dumps({'type': 'tracing', 'data': output['execution_metadata']})}\n\n"
                except Exception as stream_exc:
                    stream_error = stream_exc
                    logger.error("rag_stream_error", thread_id=thread_id, error=str(stream_exc))
                    yield f"data: {json.dumps({'type': 'error', 'message': str(stream_exc)})}\n\n"
                finally:
                    # Always persist history (even partial) to MongoDB
                    ai_content = "".join(collected_content) or ("Error during processing." if stream_error else "No answer generated.")
                    try:
                        db = mongodb_manager.get_async_database()
                        msg_col = db["chat_messages"]
                        user_doc = {
                            "thread_id": thread_id,
                            "role": "user",
                            "content": message,
                            "created_at": datetime.utcnow().isoformat(),
                        }
                        ai_doc = {
                            "thread_id": thread_id,
                            "role": "assistant",
                            "content": ai_content,
                            "created_at": datetime.utcnow().isoformat(),
                        }
                        if collected_reasoning:
                            ai_doc["reasoning_steps"] = collected_reasoning
                        if collected_sources:
                            ai_doc["sources"] = collected_sources
                        await msg_col.insert_many([user_doc, ai_doc])
                        logger.info("history_persisted", thread_id=thread_id, msg_count=2)
                        # Generate title after history is persisted
                        await ChatService.generate_title(message, thread_id, workspace_id)
                    except Exception as e:
                        logger.error("history_sync_failed", error=str(e))

            else:
                # Fallback to the existing agentic graph
                inputs = {
                    "messages": [HumanMessage(content=message)],
                    "workspace_id": workspace_id,
                }
                config = {"configurable": {"thread_id": thread_id}}

                async for event in graph_app.astream_events(
                    inputs, config=config, version="v2"
                ):
                    kind = event["event"]
                    name = event.get("name", "")

                    try:
                        if kind == "on_chain_end" and name in [
                            "rerank",
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

                    except Exception as inner_e:
                        logger.error(
                            "chat_stream_event_error",
                            event_kind=kind,
                            error=str(inner_e),
                        )
                        continue

        except Exception as e:
            import traceback

            traceback.print_exc()
            logger.error(
                "chat_stream_failed",
                thread_id=thread_id,
                error=str(e),
                exc_info=True,
            )
            from opentelemetry.trace import StatusCode

            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)
            yield f"data: {json.dumps({'type': 'error', 'message': f'Connection to reasoning engine lost: {str(e)}'})}\n\n"
        finally:
            ACTIVE_STREAMS.dec()
            span.end()


chat_service = ChatService()
