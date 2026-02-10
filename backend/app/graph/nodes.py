import time

import structlog
from typing import Dict, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, RemoveMessage
from backend.app.graph.state import AgentState
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from backend.app.tools.registry import get_tools
from backend.app.providers.llm import get_llm
from backend.app.core.settings_manager import settings_manager
from backend.app.core.telemetry import get_tracer, LLM_REQUEST_LATENCY, LLM_REQUEST_COUNT

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def retrieval_node(state: AgentState) -> Dict:
    """Retrieve relevant context based on configured settings."""
    workspace_id = state.get("workspace_id", "default")
    last_message = state["messages"][-1].content

    with tracer.start_as_current_span(
        "graph.retrieval_node",
        attributes={
            "workspace_id": workspace_id,
            "query_preview": last_message[:80],
        },
    ) as span:
        logger.info(
            "graph_retrieval_start",
            workspace_id=workspace_id,
            query_preview=last_message[:50],
        )

        results = await rag_service.search(
            query=last_message, workspace_id=workspace_id
        )

        context = []
        sources = []
        for i, res in enumerate(results):
            text = res["payload"]["text"]
            source_name = res["payload"].get("source", "Unknown")
            context.append(text)
            sources.append({"id": i + 1, "name": source_name, "content": text})

        span.set_attribute("graph.chunks_retrieved", len(context))

        engine_name = (
            "Graph-Aware"
            if results and results[0]["payload"].get("rag_engine") == "graph"
            else "Basic Hybrid"
        )

        logger.info(
            "graph_retrieval_complete",
            engine=engine_name,
            chunks_retrieved=len(context),
            workspace_id=workspace_id,
        )

        return {
            "context": context,
            "sources": sources,
            "reasoning_steps": [f"Retrieved context using {engine_name} engine"],
        }


from langchain_core.runnables import RunnableConfig


async def reason_node(state: AgentState, config: RunnableConfig) -> Dict:
    """Analyze context and decide next steps."""
    workspace_id = state.get("workspace_id", "default")

    with tracer.start_as_current_span(
        "graph.reason_node",
        attributes={"workspace_id": workspace_id},
    ) as span:
        start = time.perf_counter()

        llm = await get_llm(workspace_id)
        llm_with_tools = llm.bind_tools(get_tools())

        context_str = ""
        for s in state.get("sources", []):
            context_str += f"[{s['id']}] Source: {s['name']}\nContent: {s['content']}\n\n"

        logger.debug(
            "graph_reason_context",
            workspace_id=workspace_id,
            context_preview=context_str[:200],
        )

        summary = state.get("summary", "")
        summary_context = (
            f"\n\n--- PREVIOUS CONVERSATION SUMMARY ---\n{summary}"
            if summary
            else ""
        )

        system_prompt = SystemMessage(
            content=(
                "You are an advanced reasoning assistant. Use the provided context and conversation summary to answer the user's question. "
                "If you need more information, you can use the available tools. "
                "\n\n--- CITATION RULES ---\n"
                "You MUST cite your sources using numeric brackets like [1], [2], etc., corresponding to the context blocks. "
                "Place citations at the end of the sentences they support. "
                "If multiple sources support a point, use [1][2]. "
                "\n\n--- REASONING OPTIMIZATION (NOWAIT) ---\n"
                "Be direct and efficient in your reasoning. Avoid unnecessary self-reflection tokens. "
                + summary_context
                + "\n\n--- CONTEXT ---\n"
                + context_str
            )
        )

        logger.info("graph_reason_llm_invoke", workspace_id=workspace_id)
        messages = [system_prompt] + state["messages"]
        response = await llm_with_tools.ainvoke(messages, config=config)

        duration = time.perf_counter() - start

        # Determine provider for metrics
        provider_name = type(llm).__name__
        LLM_REQUEST_LATENCY.labels(
            provider=provider_name, operation="reason"
        ).observe(duration)
        LLM_REQUEST_COUNT.labels(
            provider=provider_name, operation="reason", status="ok"
        ).inc()

        # Attach reasoning data
        current_steps = state.get("reasoning_steps", []) + [
            "Reasoning about the query and context"
        ]
        response.additional_kwargs["reasoning_steps"] = current_steps
        response.additional_kwargs["sources"] = state.get("sources", [])

        span.set_attribute("graph.has_tool_calls", bool(response.tool_calls))
        span.set_attribute("graph.response_length", len(response.content))
        span.set_attribute(
            "graph.duration_ms", round(duration * 1000, 2)
        )

        if response.tool_calls:
            logger.info(
                "graph_reason_tool_calls",
                num_calls=len(response.tool_calls),
                tools=[tc["name"] for tc in response.tool_calls],
            )
        else:
            logger.info(
                "graph_reason_direct_response",
                response_length=len(response.content),
                duration_ms=round(duration * 1000, 2),
            )

        return {"messages": [response], "reasoning_steps": current_steps}


async def generate_node(state: AgentState) -> Dict:
    """Synthesize the final answer."""
    with tracer.start_as_current_span("graph.generate_node"):
        final_steps = state.get("reasoning_steps", []) + [
            "Synthesizing final response"
        ]

        last_msg = state["messages"][-1]
        if isinstance(last_msg, AIMessage):
            updated_msg = AIMessage(
                content=last_msg.content,
                id=getattr(last_msg, "id", None),
                additional_kwargs={
                    **last_msg.additional_kwargs,
                    "reasoning_steps": final_steps,
                },
            )
            return {"messages": [updated_msg], "reasoning_steps": final_steps}

        return {"reasoning_steps": final_steps}


async def summarize_node(state: AgentState) -> Dict:
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

        existing_summary = state.get("summary", "")
        if existing_summary:
            summary_prompt = (
                f"This is a summary of the conversation history so far: {existing_summary}\n\n"
                "Extend the summary by adding the new messages below. "
                "IMPORTANT: Preserve all specific facts, numbers, and user-provided details concisely."
            )
        else:
            summary_prompt = (
                "Summarize the following conversation history concisely. "
                "IMPORTANT: You MUST preserve all specific facts, numbers, and key details provided by the user."
            )

        messages_to_summarize = messages[:-2]

        response = await llm.ainvoke(
            [SystemMessage(content=summary_prompt)] + messages_to_summarize
        )

        new_summary = response.content
        delete_messages = [
            RemoveMessage(id=m.id)
            for m in messages_to_summarize
            if hasattr(m, "id")
        ]

        span.set_attribute("graph.summarized_messages", len(messages_to_summarize))
        span.set_attribute("graph.summary_length", len(new_summary))

        logger.info(
            "graph_summarize_complete",
            summarized_messages=len(messages_to_summarize),
            summary_length=len(new_summary),
        )

        return {"summary": new_summary, "messages": delete_messages}
