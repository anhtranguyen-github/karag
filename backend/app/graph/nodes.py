import time

import structlog
from backend.app.core.telemetry import (
    LLM_REQUEST_COUNT,
    LLM_REQUEST_LATENCY,
    get_tracer,
)
from backend.app.graph.state import AgentState
from backend.app.providers.llm import get_llm
from backend.app.rag.rag_service import rag_service
from langchain_core.messages import AIMessage, RemoveMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def retrieval_node(state: AgentState) -> dict:
    """Retrieve relevant context based on configured settings."""
    workspace_id = state.get("workspace_id", "default")
    last_message = state["messages"][-1].content

    from backend.app.core.settings_manager import settings_manager

    settings = await settings_manager.get_settings(workspace_id)

    with tracer.start_as_current_span(
        "graph.retrieval_node",
        attributes={
            "workspace_id": workspace_id,
            "query_preview": last_message[:80],
        },
    ) as span:
        # We perform initial search. Reranking will happen in the next node.
        # This allows visibility into the multi-stage pipeline.
        results = await rag_service.search(
            query=last_message,
            workspace_id=workspace_id,
            limit=settings.search_limit * 2,  # Retrieve more for reranking
        )

        span.set_attribute("graph.initial_chunks", len(results))

        return {
            "sources": results,
            "agentic_enabled": settings.agentic_enabled,
            "reasoning_steps": ["Retrieved initial candidates from vector store"],
        }


async def rerank_node(state: AgentState) -> dict:
    """Refine and sort retrieved documents."""
    workspace_id = state.get("workspace_id", "default")
    last_message = state["messages"][-1].content
    raw_results = state.get("sources", [])

    if not raw_results:
        return {"reasoning_steps": ["No candidates found to rerank"]}

    from backend.app.core.settings_manager import settings_manager
    from backend.app.providers.reranker import get_reranker

    settings = await settings_manager.get_settings(workspace_id)

    reranker = None
    if settings.reranker_enabled:
        reranker = await get_reranker(workspace_id)

    if not reranker:
        # Fallback processing if reranker disabled
        context = []
        sources = []
        for i, res in enumerate(raw_results[: settings.search_limit]):
            text = res["payload"]["text"]
            source_name = res["payload"].get("source", "Unknown")
            context.append(text)
            sources.append({"id": i + 1, "name": source_name, "content": text})

        return {
            "context": context,
            "sources": sources,
            "reasoning_steps": ["Skipped reranking (disabled)"],
        }

    with tracer.start_as_current_span("graph.rerank_node") as span:
        reranked = await reranker.rerank(
            query=last_message, documents=raw_results, top_k=settings.rerank_top_k
        )

        context = []
        sources = []
        for i, res in enumerate(reranked):
            text = res["payload"]["text"]
            source_name = res["payload"].get("source", "Unknown")
            context.append(text)
            sources.append({"id": i + 1, "name": source_name, "content": text})

        span.set_attribute("graph.reranked_chunks", len(context))
        plugin_name = type(reranker).__name__

        return {
            "context": context,
            "sources": sources,
            "reasoning_steps": [f"Reranked documents using {plugin_name}"],
        }


async def reason_node(state: AgentState, config: RunnableConfig) -> dict:
    """Analyze context and decide next steps."""
    workspace_id = state.get("workspace_id", "default")

    with tracer.start_as_current_span(
        "graph.reason_node",
        attributes={"workspace_id": workspace_id},
    ) as span:
        start = time.perf_counter()

        llm = await get_llm(workspace_id)

        context_str = ""
        for s in state.get("sources", []):
            context_str += f"[{s['id']}] Source: {s['name']}\nContent: {s['content']}\n\n"

        logger.debug(
            "graph_reason_context",
            workspace_id=workspace_id,
            context_preview=context_str[:200],
        )

        summary = state.get("summary", "")
        summary_context = f"\n\n--- PREVIOUS CONVERSATION SUMMARY ---\n{summary}" if summary else ""

        from backend.app.core.prompt_manager import prompt_manager

        system_base = prompt_manager.get_prompt("rag_system.system", version="v1")

        system_prompt = SystemMessage(
            content=(f"{system_base}\n\n{summary_context}\n\n--- CONTEXT ---\n{context_str}")
        )

        logger.info("graph_reason_llm_invoke", workspace_id=workspace_id)
        messages = [system_prompt] + state["messages"]

        try:
            response = await llm.ainvoke(messages, config=config)
        except Exception as e:
            logger.error("graph_reason_llm_failed", error=str(e), workspace_id=workspace_id)
            # Create a graceful error message as the response
            error_msg = f"Error: Failed to connect to the reasoning engine ({type(llm).__name__}). Please ensure the service is running or check your configuration."
            if "ConnectError" in str(e) or "connection" in str(e).lower():
                error_msg = f"Error: Connection to {type(llm).__name__} failed. If using local models, ensure Ollama/vLLM is running."

            response = AIMessage(content=error_msg)
            return {
                "messages": [response],
                "reasoning_steps": state.get("reasoning_steps", []) + ["Internal reasoning error"],
            }

        # Determine provider and model for metrics
        provider_name = type(llm).__name__
        model_name = getattr(llm, "model_name", getattr(llm, "model", "unknown"))

        # Extract token usage (LangChain standard)
        usage = getattr(response, "usage_metadata", {})
        if usage:
            from backend.app.core.telemetry import record_llm_usage

            record_llm_usage(
                provider=provider_name,
                model=model_name,
                prompt_tokens=usage.get("input_tokens", 0),
                completion_tokens=usage.get("output_tokens", 0),
                workspace_id=workspace_id,
            )

        duration = time.perf_counter() - start

        LLM_REQUEST_LATENCY.labels(provider=provider_name, operation="reason").observe(duration)
        LLM_REQUEST_COUNT.labels(provider=provider_name, operation="reason", status="ok").inc()

        # Attach reasoning data
        current_steps = state.get("reasoning_steps", []) + ["Reasoning about the query and context"]
        response.additional_kwargs["reasoning_steps"] = current_steps
        response.additional_kwargs["sources"] = state.get("sources", [])

        span.set_attribute("llm.model", model_name)
        span.set_attribute("graph.response_length", len(response.content))
        span.set_attribute("graph.duration_ms", round(duration * 1000, 2))

        return {"messages": [response], "reasoning_steps": current_steps}


async def generate_node(state: AgentState) -> dict:
    """Synthesize the final answer."""
    workspace_id = state.get("workspace_id", "default")

    with tracer.start_as_current_span("graph.generate_node"):
        final_steps = state.get("reasoning_steps", []) + ["Synthesizing final response"]

        last_msg = state["messages"][-1]

        # If we already have an AIMessage (from reason_node), just append metadata
        if isinstance(last_msg, AIMessage):
            updated_msg = AIMessage(
                content=last_msg.content,
                id=getattr(last_msg, "id", None),
                additional_kwargs={
                    **last_msg.additional_kwargs,
                    "reasoning_steps": final_steps,
                    "sources": state.get("sources", []),
                },
            )
            return {"messages": [updated_msg], "reasoning_steps": final_steps}

        # Otherwise (non-agentic flow), generate the response now
        from backend.app.core.settings_manager import settings_manager

        settings = await settings_manager.get_settings(workspace_id)
        llm = await get_llm(workspace_id)

        context_str = "\n\n".join(state.get("context", []))
        system_prompt = settings.system_prompt

        full_system = f"{system_prompt}\n\nContext:\n{context_str}"

        response = await llm.ainvoke([SystemMessage(content=full_system)] + state["messages"])

        # Record usage
        usage = getattr(response, "usage_metadata", {})
        if usage:
            from backend.app.core.telemetry import record_llm_usage

            record_llm_usage(
                provider=type(llm).__name__,
                model=getattr(llm, "model_name", getattr(llm, "model", "unknown")),
                prompt_tokens=usage.get("input_tokens", 0),
                completion_tokens=usage.get("output_tokens", 0),
                workspace_id=workspace_id,
            )

        response.additional_kwargs["reasoning_steps"] = final_steps
        response.additional_kwargs["sources"] = state.get("sources", [])

        return {"messages": [response], "reasoning_steps": final_steps}


async def summarize_node(state: AgentState) -> dict:
    """Summarize the conversation history if it gets too long."""
    messages = state["messages"]
    if len(messages) <= 6:
        return {}

    workspace_id = state.get("workspace_id", "default")

    with tracer.start_as_current_span(
        "graph.summarize_node",
        attributes={
            "workspace_id": workspace_id,
            "messages_count": len(messages),
        },
    ) as span:
        llm = await get_llm(workspace_id)

        logger.info(
            "graph_summarize_start",
            messages_count=len(messages),
            workspace_id=workspace_id,
        )

        from backend.app.core.prompt_manager import prompt_manager

        existing_summary = state.get("summary", "")
        if existing_summary:
            summary_prompt_base = prompt_manager.get_prompt("summarizer.extend", version="v1")
            summary_prompt = prompt_manager.format_prompt(
                summary_prompt_base, existing_summary=existing_summary
            )
        else:
            summary_prompt = prompt_manager.get_prompt("summarizer.create", version="v1")

        messages_to_summarize = messages[:-2]

        response = await llm.ainvoke(
            [SystemMessage(content=summary_prompt)] + messages_to_summarize
        )

        # Record usage
        usage = getattr(response, "usage_metadata", {})
        if usage:
            from backend.app.core.telemetry import record_llm_usage

            record_llm_usage(
                provider=type(llm).__name__,
                model=getattr(llm, "model_name", getattr(llm, "model", "unknown")),
                prompt_tokens=usage.get("input_tokens", 0),
                completion_tokens=usage.get("output_tokens", 0),
            )

        new_summary = response.content
        delete_messages = [
            RemoveMessage(id=m.id) for m in messages_to_summarize if hasattr(m, "id")
        ]

        span.set_attribute("graph.summarized_messages", len(messages_to_summarize))
        span.set_attribute("graph.summary_length", len(new_summary))

        logger.info(
            "graph_summarize_complete",
            summarized_messages=len(messages_to_summarize),
            summary_length=len(new_summary),
        )

        return {"summary": new_summary, "messages": delete_messages}
