import time
from typing import Any

from src.backend.app.core.factory import ProviderFactory
from src.backend.app.rag.graph.state import GraphState
from src.backend.app.rag.rag_service import rag_service
from src.backend.app.schemas.execution import ExecutionMode
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig


async def init_execution(state: GraphState) -> dict[str, Any]:
    """Initialize execution parameters, tools, and metadata."""
    mode = state["settings"].execution_mode
    return {
        "loop_count": 0,
        "is_sufficient": True if mode == ExecutionMode.FAST else False,
        "generated_queries": [],
        "retrieved_results": [],
        "web_results": [],
        "tool_calls": [],
        "tool_outputs": [],
        "execution_metadata": {
            "start_time": time.time(),
            "mode": mode,
            "nodes_visited": ["init"],
            "retrieval_calls": 0,
            "generation_calls": 0,
            "reflection_results": [],
        },
    }


async def analyze_intent(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    """Analyze query intent and plan the execution path."""
    mode = state["settings"].execution_mode

    # Fast track for simple greetings
    import re

    greetings = r"^(hello|hi|hey|greetings|howdy|what's up|hi there|hello there)(\s[a-z]+)*[!?.]*$"
    if re.match(greetings, state["query"].lower().strip()):
        return {
            "intent_analysis": "greeting",
            "confidence_level": 1.0,
            "execution_metadata": {
                **state.get("execution_metadata", {}),
                "intent": "greeting",
            },
        }

    llm = await ProviderFactory.get_llm(state["workspace_id"])

    today = time.strftime("%Y-%m-%d")
    if mode == ExecutionMode.AUTO:
        system_prompt = (
            f"Today is {today}. You are an Orchestrator Agent. "
            "Analyze the user query and decide on the best strategy. "
            "Respond with exactly one of these tags at the beginning: "
            "[STRATEGY: internal_rag], [STRATEGY: web_search], [STRATEGY: hybrid], or [STRATEGY: direct].\n\n"
            "Rules:\n"
            "- Use [STRATEGY: web_search] for ANY query about recent news, sports scores, current events, or information likely to have changed after 2023.\n"
            "- Use [STRATEGY: internal_rag] for queries about the current project, workspace files, or internal company data.\n"
            "- Use [STRATEGY: hybrid] if both are needed.\n"
            "- Use [STRATEGY: direct] ONLY for greetings (hello, hi) or simple mathematical/language questions that are time-invariant.\n\n"
            "Respond with the [STRATEGY: tag] then a short reasoning."
        )
    else:
        system_prompt = (
            f"Today is {today}. Analyze the user query to calibrate reasoning depth. "
            "Classify as 'simple', 'complex', or 'research_heavy'."
        )

    # Convert dict history to LangChain messages
    history_messages = []
    for m in state.get("history", []):
        if m["role"] == "user":
            history_messages.append(HumanMessage(content=m["content"]))
        else:
            history_messages.append(SystemMessage(content=m["content"]))  # Assistant as system for intent analyzer

    messages = [
        SystemMessage(content=system_prompt),
        *history_messages[-5:],  # Last 5 for context
        HumanMessage(content=state["query"]),
    ]
    response = await llm.ainvoke(messages, config={**config, "tags": ["reasoning"]})
    intent = response.content

    metadata = state.get("execution_metadata", {})
    metadata["nodes_visited"].append("analyze")
    metadata["intent_plan"] = intent

    return {"intent_analysis": intent, "execution_metadata": metadata}


async def build_query_context(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    """Generate search queries optimized for the current mode."""
    mode = state["settings"].execution_mode
    query = state["query"]
    intent = state.get("intent_analysis", "").lower()

    # Determine query count based on mode requirements
    count = 2
    if mode == ExecutionMode.FAST:
        count = 8  # "FAST: many retrieval queries"
    elif mode == ExecutionMode.DEEP:
        count = state["settings"].deep.multi_query_limit
    elif mode == ExecutionMode.THINK:
        count = 3
    elif mode == ExecutionMode.AUTO:
        count = 2 if any(x in intent for x in ["hybrid", "rag", "web"]) else 0

    if count == 0:
        return {"generated_queries": []}

    today = time.strftime("%Y-%m-%d")
    llm = await ProviderFactory.get_llm(state["workspace_id"])
    system_prompt = (
        f"Today is {today}. Generate {count} unique, highly specific search queries to retrieve foundational facts for: '{query}'. "
        "Focus on specific entities, dates, and recent events. "
        "Break complex questions into atomic search components."
    )
    if state["loop_count"] > 0:
        system_prompt += "\nPrevious results were insufficient. Analyze current context gaps and refine queries."

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=query)]
    response = await llm.ainvoke(messages, config={**config, "tags": ["reasoning"]})
    queries = [q.strip("- ") for q in response.content.split("\n") if q.strip()][:count]

    return {"generated_queries": queries or [query]}


async def retrieve_context(state: GraphState) -> dict[str, Any]:
    """Search the internal vector database."""
    queries = state["generated_queries"]
    if not queries:
        return {"retrieved_results": []}

    import asyncio

    search_tasks = [rag_service.search(query=q, workspace_id=state["workspace_id"]) for q in queries]
    all_results = await asyncio.gather(*search_tasks)

    results = []
    for search_results in all_results:
        results.extend(search_results)

    metadata = state.get("execution_metadata", {})
    metadata["retrieval_calls"] += len(queries)
    metadata["nodes_visited"].append("retrieve")

    return {"retrieved_results": results, "execution_metadata": metadata}


async def web_search(state: GraphState) -> dict[str, Any]:
    """Execution of web search via Tavily MCP."""
    mode = state["settings"].execution_mode
    intent = state.get("intent_analysis", "").lower()

    # Detect if query is news-like or temporal even if LLM missed it in intent
    import re

    temporal_patterns = r"(latest|score|today|yesterday|news|recent|current|weather|results|game)"
    looks_like_news = bool(re.search(temporal_patterns, state["query"].lower()))

    # Only skip if we are in a mode that doesn't want web or if AUTO/FAST decided against it
    should_search = (
        (mode in [ExecutionMode.DEEP, ExecutionMode.THINK])
        or ("web" in intent or "hybrid" in intent or "research" in intent)
        or (mode == ExecutionMode.AUTO and looks_like_news)
    )

    if not should_search:
        return {"web_results": []}

    from src.backend.app.rag.tools.tavily_mcp import tavily_tool

    # Use the primary query or a refined one
    query = state["query"]
    results = await tavily_tool.search(query)

    metadata = state.get("execution_metadata", {})
    metadata["nodes_visited"].append("web_search")

    return {"web_results": results, "execution_metadata": metadata}


async def blend_results(state: GraphState) -> dict[str, Any]:
    """Consolidate internal and web results into a single candidate list."""
    internal = state.get("retrieved_results", [])
    web = state.get("web_results", [])

    candidates = []
    # Normalize formats
    for res in internal:
        candidates.append(
            {
                "text": res.get("text", ""),
                "source": "internal",
                "score": res.get("score", 0.0),
                "payload": res.get("payload", {}),
            }
        )
    for res in web:
        content = res.get("content") or res.get("snippet") or str(res)
        candidates.append(
            {
                "text": content,
                "source": "web",
                "score": 1.0,  # Web results often don't have scores from Tavily in this format
                "payload": res,
            }
        )

    # Initial deduplication by text content
    seen = set()
    unique_candidates = []
    for c in candidates:
        if c["text"] not in seen:
            unique_candidates.append(c)
            seen.add(c["text"])

    return {
        "retrieved_results": unique_candidates,  # Use retrieved_results as the 'working' list
        "execution_metadata": {
            **state["execution_metadata"],
            "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["blend"],
        },
    }


async def rerank_results(state: GraphState) -> dict[str, Any]:
    """Optional reranking of blended results."""
    from src.backend.app.providers.reranker import get_reranker

    candidates = state.get("retrieved_results", [])
    if not candidates:
        return {
            "blended_context": "",
            "execution_metadata": {
                **state["execution_metadata"],
                "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["rerank"],
            },
        }

    reranker = await get_reranker(state["workspace_id"])

    if reranker:
        # Cross-encoder expects List[Dict] with 'payload': {'text': ...}
        # My candidates already have 'text' at top level, but reranker.py looks for payload['text']
        formatted_for_reranker = []
        for c in candidates:
            formatted_for_reranker.append({"payload": {"text": c["text"]}, "original_data": c})

        top_n = 10  # Default fallback
        try:
            from src.backend.app.core.settings_manager import settings_manager

            settings = await settings_manager.get_settings(state["workspace_id"])
            top_n = settings.retrieval.rerank.top_n
        except Exception:
            pass

        reranked = await reranker.rerank(state["query"], formatted_for_reranker, top_k=top_n)

        final_candidates = []
        for r in reranked:
            c = r["original_data"]
            c["rerank_score"] = r["rerank_score"]
            final_candidates.append(c)
    else:
        # Fallback to simple slice if no reranker
        limit = 25 if state["settings"].execution_mode == ExecutionMode.DEEP else 12
        final_candidates = candidates[:limit]

    # Format into final blended string
    formatted_parts = []
    for c in final_candidates:
        source_label = "[Internal]" if c["source"] == "internal" else "[Web]"
        formatted_parts.append(f"{source_label} {c['text']}")

    blended = "\n\n---\n\n".join(formatted_parts)

    return {
        "blended_context": blended,
        "execution_metadata": {
            **state["execution_metadata"],
            "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["rerank"],
        },
    }


async def reflect_and_decide(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    """Review sufficiency of collected information."""
    mode = state["settings"].execution_mode

    # FAST mode terminates after one loop
    if mode == ExecutionMode.FAST:
        return {"is_sufficient": True}

    if state["loop_count"] >= state["settings"].max_loops:
        return {"is_sufficient": True}

    # THRESHOLDS for forced termination
    threshold = 8000 if mode == ExecutionMode.DEEP else 3000
    if len(state.get("blended_context", "")) > threshold and state["loop_count"] > 0:
        return {"is_sufficient": True}

    llm = await ProviderFactory.get_llm(state["workspace_id"])

    # Persona-based reflection
    if mode == ExecutionMode.THINK:
        system_prompt = (
            "You are a Critical Reviewer. Audit the following context against the user question. "
            "Is there any ambiguity? Any missing data? or contradictory information? "
            "If it's perfect, respond 'YES'. If it needs more work, respond 'NO'."
        )
    else:
        system_prompt = "Determine if the collected context is sufficient to answer the question. Respond YES/NO only."

    context_preview = state.get("blended_context", "")[:6000]
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Question: {state['query']}\n\nContext:\n{context_preview}"),
    ]
    response = await llm.ainvoke(messages, config={**config, "tags": ["reasoning"]})
    sufficient = "yes" in response.content.lower()

    metadata = state.get("execution_metadata", {})
    metadata["reflection_results"].append(sufficient)
    metadata["nodes_visited"].append("reflect")

    return {
        "is_sufficient": sufficient,
        "loop_count": state["loop_count"] + 1,
        "execution_metadata": metadata,
    }


async def assemble_context(state: GraphState) -> dict[str, Any]:
    """Final preparation."""
    return {"final_context": state.get("blended_context", "")}


async def generate_answer(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    """Produce final response with mode-specific structure."""
    llm = await ProviderFactory.get_llm(state["workspace_id"])
    mode = state["settings"].execution_mode

    today = time.strftime("%Y-%m-%d")
    context = state.get("final_context", "").strip()

    if mode == ExecutionMode.DEEP:
        system_prompt = (
            f"Today is {today}. You are a Senior Research Analyst. Synthesize the context into a long, detailed, and professional report. "
            "Use markdown headers, structured tables if applicable, and deep analysis. "
            "Cite sources strictly as [Internal] or [Web]. Do not omit any relevant technical detail."
        )
    elif mode == ExecutionMode.THINK:
        system_prompt = (
            f"Today is {today}. Provide a well-reasoned answer. Start with a brief 'Reasoning' section explaining how you arrived at the answer. "
            "Then provide the final response."
        )
    else:
        system_prompt = (
            f"Today is {today}. Answer the user question accurately using the provided context. "
            "CITATIONS: Use [Internal] for knowledge base and [Web] for web search results.\n\n"
            "REAL-TIME/NEWS HANDLING:\n"
            "1. If the context contains current info, use it. Do NOT mention your training cutoff.\n"
            "2. If the context is empty or doesn't have the answer, EXPLAIN that you searched for 'latest information' but the current knowledge sources did not provide a match.\n"
            "3. Do NOT provide a generic 'I don't have real-time access' apology. Be specific about what happened in the search process."
        )

    # Format history for the generator
    history_context = ""
    if state.get("history"):
        history_parts = []
        for m in state["history"][-6:]:  # Last 6 messages
            role = "User" if m["role"] == "user" else "Assistant"
            history_parts.append(f"{role}: {m['content']}")
        history_context = "--- CONVERSATION HISTORY ---\n" + "\n".join(history_parts) + "\n\n"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"{history_context}Context:\n{context}\n\nQuestion: {state['query']}"),
    ]
    response = await llm.ainvoke(messages, config={**config, "tags": ["final_answer"]})

    metadata = state.get("execution_metadata", {})
    metadata["generation_calls"] += 1
    metadata["nodes_visited"].append("generation")

    return {"final_answer": response.content, "execution_metadata": metadata}


async def synthesize_answer(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    """Fallback/Synthesis node."""
    if state.get("final_answer"):
        return {"final_answer": state["final_answer"]}
    return {"final_answer": "Processing complete but no content generated."}

