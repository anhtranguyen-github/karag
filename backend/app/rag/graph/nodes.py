import time
from typing import Dict, Any, List
from backend.app.rag.graph.state import GraphState
from backend.app.schemas.execution import ExecutionMode
from backend.app.rag.rag_service import rag_service
from backend.app.providers.llm import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

async def init_execution(state: GraphState) -> Dict[str, Any]:
    """Initialize growth-level execution parameters."""
    mode = state["settings"].execution_mode
    return {
        "loop_count": 0,
        "is_sufficient": True if mode == ExecutionMode.FAST else False,
        "execution_metadata": {
            "start_time": time.time(),
            "nodes_visited": ["init_execution"]
        }
    }

async def analyze_intent(state: GraphState) -> Dict[str, Any]:
    """Analyze the user's intent to decide on reasoning depth (Thinking/Deep only)."""
    if state["settings"].execution_mode == ExecutionMode.FAST:
        return {"intent_analysis": "direct_query", "confidence_level": 1.0}
    
    llm = await get_llm(state["workspace_id"])
    system_prompt = "You are an intent analyzer. Classify the user query as 'simple', 'complex', or 'ambiguous'. Provide a confidence score (0-1)."
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["query"])
    ]
    response = await llm.ainvoke(messages)
    # Simple parsing logic for prototype
    analysis = response.content.lower()
    confidence = 0.8 # Placeholder for real logic
    
    return {
        "intent_analysis": analysis,
        "confidence_level": confidence,
        "execution_metadata": {**state["execution_metadata"], "intent": analysis}
    }

async def build_query_context(state: GraphState) -> Dict[str, Any]:
    """Generate one or more retrieval queries based on mode and history."""
    mode = state["settings"].execution_mode
    query = state["query"]
    
    if mode == ExecutionMode.FAST:
        return {"generated_queries": [query]}
    
    # For Thinking/Deep/Blending, we might generate variants or refactor based on previous loops
    llm = await get_llm(state["workspace_id"])
    count = 3 if mode in [ExecutionMode.DEEP, ExecutionMode.BLENDING] else 1
    
    system_prompt = f"Generate {count} unique search queries to find information related to the user's question. Format as a simple list."
    if state["loop_count"] > 0:
        system_prompt += f" Prev queries failed to find sufficient info: {state['generated_queries']}"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query)
    ]
    response = await llm.ainvoke(messages)
    queries = [q.strip() for q in response.content.split("\n") if q.strip()]
    
    return {"generated_queries": queries}

async def retrieve_context(state: GraphState) -> Dict[str, Any]:
    """Call the RAG retrieval engine to fetch results for generated queries."""
    results = []
    queries = state["generated_queries"]
    
    # We retrieve for the most recent batch of queries
    last_queries = queries[-3:] if state["settings"].execution_mode != ExecutionMode.FAST else queries[-1:]
    
    for q in last_queries:
        search_results = await rag_service.search(
            query=q,
            workspace_id=state["workspace_id"]
        )
        results.extend(search_results)
    
    return {
        "retrieved_results": results,
        "execution_metadata": {
            **state["execution_metadata"],
            "retrieval_calls": state["execution_metadata"].get("retrieval_calls", 0) + len(last_queries)
        }
    }

async def blend_results(state: GraphState) -> Dict[str, Any]:
    """Merge and deduplicate retrieval outputs (Thinking/Deep/Blending)."""
    results = state["retrieved_results"]
    if not results:
        return {"blended_context": ""}
    
    # Simple deduplication by chunk ID or text hash
    seen_texts = set()
    unique_results = []
    for res in results:
        text = res.get("text", "")
        if text not in seen_texts:
            seen_texts.add(text)
            unique_results.append(res)
    
    # Optionally rank or limit
    blended_text = "\n\n".join([r.get("text", "") for r in unique_results[:10]])
    return {"blended_context": blended_text}

async def reflect_and_decide(state: GraphState) -> Dict[str, Any]:
    """Decide whether the information is sufficient to answer (Thinking/Deep only)."""
    mode = state["settings"].execution_mode
    if mode == ExecutionMode.FAST:
        return {"is_sufficient": True}
    
    # Exit if max loops reached
    if state["loop_count"] >= state["settings"].max_loops:
        return {"is_sufficient": True}
    
    llm = await get_llm(state["workspace_id"])
    system_prompt = (
        "You are a reflection agent. Assess if the retrieved context is sufficient to answer the user's question accurately. "
        "Respond with 'SUFFICIENT' or 'INSUFFICIENT'."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Question: {state['query']}\n\nContext: {state['blended_context']}")
    ]
    response = await llm.ainvoke(messages)
    sufficient = response.content.lower().strip() == "sufficient"
    
    return {
        "is_sufficient": sufficient,
        "loop_count": state["loop_count"] + 1,
        "execution_metadata": {
            **state["execution_metadata"],
            "reflection_results": state["execution_metadata"].get("reflection_results", []) + [sufficient]
        }
    }

async def assemble_context(state: GraphState) -> Dict[str, Any]:
    """Prepare the final context for the generation model."""
    # This node can handle context window truncation or priority sorting
    context = state["blended_context"] or ""
    return {"final_context": context[:8000]} # Simple truncation for now

async def generate_answer(state: GraphState) -> Dict[str, Any]:
    """Call the generation model to produce one or more draft answers."""
    llm = await get_llm(state["workspace_id"])
    context = state["final_context"]
    
    system_prompt = "You are a helpful assistant. Use the provided context to answer the user's question. If the answer is not in the context, say you don't know."
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Context: {context}\n\nQuestion: {state['query']}")
    ]
    
    # In Blending mode, we might generate multiple drafts
    num_drafts = 2 if state["settings"].execution_mode == ExecutionMode.BLENDING else 1
    drafts = []
    
    for _ in range(num_drafts):
        response = await llm.ainvoke(messages)
        drafts.append(response.content)
    
    return {
        "draft_answers": drafts,
        "execution_metadata": {
            **state["execution_metadata"],
            "generation_calls": state["execution_metadata"].get("generation_calls", 0) + num_drafts
        }
    }

async def synthesize_answer(state: GraphState) -> Dict[str, Any]:
    """Synthesize final answer from drafts (Blending mode)."""
    drafts = state["draft_answers"]
    if len(drafts) == 1:
        return {"final_answer": drafts[0]}
    
    llm = await get_llm(state["workspace_id"])
    system_prompt = "You are a synthesizer. Combine multiple draft answers into a single, cohesive, and comprehensive response."
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="\n\n".join([f"Draft {i+1}: {d}" for i, d in enumerate(drafts)]))
    ]
    response = await llm.ainvoke(messages)
    return {"final_answer": response.content}
