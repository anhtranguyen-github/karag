import time
from typing import Dict, Any
from backend.app.rag.graph.state import GraphState
from backend.app.schemas.execution import ExecutionMode
from backend.app.rag.rag_service import rag_service
from backend.app.core.factory import LangChainFactory
from langchain_core.messages import HumanMessage, SystemMessage

async def init_execution(state: GraphState) -> Dict[str, Any]:
    """Initialize growth-level execution parameters and metadata."""
    mode = state["settings"].execution_mode
    return {
        "loop_count": 0,
        "is_sufficient": True if mode == ExecutionMode.FAST else False,
        "execution_metadata": {
            "start_time": time.time(),
            "mode": mode,
            "nodes_visited": ["init"],
            "retrieval_calls": 0,
            "generation_calls": 0,
            "reflection_results": []
        }
    }

async def analyze_intent(state: GraphState) -> Dict[str, Any]:
    """Analyze query intent to calibrate reasoning depth."""
    mode = state["settings"].execution_mode
    if mode == ExecutionMode.FAST:
        return {"intent_analysis": "direct", "confidence_level": 1.0}
    
    llm = await LangChainFactory.get_llm(state["workspace_id"])
    system_prompt = (
        "Analyze the user query. Classify it as 'simple', 'complex', or 'ambiguous'. "
        "Simple queries need direct answers. Complex queries need multi-step retrieval. "
        "Ambiguous queries need clarification or broad search."
    )
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=state["query"])]
    response = await llm.ainvoke(messages)
    
    metadata = state.get("execution_metadata", {})
    metadata["nodes_visited"].append("analyze")
    metadata["intent"] = response.content[:100]
    
    return {
        "intent_analysis": response.content,
        "execution_metadata": metadata
    }

async def build_query_context(state: GraphState) -> Dict[str, Any]:
    """Generate search queries optimized for the current execution loop."""
    mode = state["settings"].execution_mode
    query = state["query"]
    
    if mode == ExecutionMode.FAST:
        return {"generated_queries": [query]}
    
    # Decisions on query volume are made here based on mode
    count = 1
    if mode == ExecutionMode.DEEP:
        count = 3
    elif mode == ExecutionMode.BLENDING:
        count = 2
        
    llm = await LangChainFactory.get_llm(state["workspace_id"])
    system_prompt = f"Generate {count} unique, optimized search queries to find facts for the user's question."
    if state["loop_count"] > 0:
        system_prompt += " Previous attempts found insufficient info. Refine queries to be more specific."

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=query)]
    response = await llm.ainvoke(messages)
    queries = [q.strip("- ") for q in response.content.split("\n") if q.strip()][:count]
    
    # Ensure fall-back to original query
    if not queries:
        queries = [query]
        
    return {"generated_queries": queries}

async def retrieve_context(state: GraphState) -> Dict[str, Any]:
    """Execute retrieval via the RAG implementation layer."""
    results = []
    queries = state["generated_queries"]
    
    for q in queries:
        # Calls the refactored rag_service.search which uses LangChain factory retrievers
        search_results = await rag_service.search(query=q, workspace_id=state["workspace_id"])
        results.extend(search_results)
    
    metadata = state.get("execution_metadata", {})
    metadata["retrieval_calls"] += len(queries)
    metadata["nodes_visited"].append("retrieve")
    
    return {
        "retrieved_results": results,
        "execution_metadata": metadata
    }

async def blend_results(state: GraphState) -> Dict[str, Any]:
    """Consolidate multi-query retrieval results."""
    results = state["retrieved_results"]
    if not results:
        return {"blended_context": "", "execution_metadata": {**state["execution_metadata"], "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["blend"]}}
    
    # Logic: Deduplicate by text content
    unique_texts = {}
    for res in results:
        text = res.get("text", "")
        if text and text not in unique_texts:
            unique_texts[text] = res
            
    # Format and truncate based on mode if necessary
    sorted_texts = list(unique_texts.keys())
    # Blending mode preserves more context for synthesis
    limit = 15 if state["settings"].execution_mode == ExecutionMode.BLENDING else 8
    
    blended = "\n\n".join(sorted_texts[:limit])
    return {
        "blended_context": blended,
        "execution_metadata": {**state["execution_metadata"], "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["blend"]}
    }

async def reflect_and_decide(state: GraphState) -> Dict[str, Any]:
    """Graph-level reflection to decide if looping is required."""
    mode = state["settings"].execution_mode
    if mode == ExecutionMode.FAST or state["loop_count"] >= state["settings"].max_loops:
        return {"is_sufficient": True}
    
    llm = await LangChainFactory.get_llm(state["workspace_id"])
    system_prompt = (
        "You are a fact-checking judge. Determine if the context below is sufficient to answer the user's question completely. "
        "Respond with 'YES' or 'NO' only."
    )
    context_preview = state["blended_context"][:4000]
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Question: {state['query']}\n\nContext:\n{context_preview}")
    ]
    response = await llm.ainvoke(messages)
    sufficient = "yes" in response.content.lower()
    
    metadata = state.get("execution_metadata", {})
    metadata["reflection_results"].append(sufficient)
    metadata["nodes_visited"].append("reflect")
    
    return {
        "is_sufficient": sufficient,
        "loop_count": state["loop_count"] + 1,
        "execution_metadata": metadata
    }

async def assemble_context(state: GraphState) -> Dict[str, Any]:
    """Final stage of context preparation before generation."""
    return {
        "final_context": state["blended_context"],
        "execution_metadata": {**state["execution_metadata"], "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["assemble"]}
    }

async def generate_answer(state: GraphState) -> Dict[str, Any]:
    """Produce draft answers using the configured LLM."""
    llm = await LangChainFactory.get_llm(state["workspace_id"])
    
    # System prompt logic remains in code as 'Thinking' behavior
    system_prompt = (
        "Use the provided context to answer the user's question accurately. "
        "Cite relevant documents if possible. If unsure, state it clearly."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Context:\n{state['final_context']}\n\nQuestion: {state['query']}")
    ]
    
    # Blending mode generates multiple independent candidates for synthesis
    num_to_generate = 2 if state["settings"].execution_mode == ExecutionMode.BLENDING else 1
    drafts = []
    for _ in range(num_to_generate):
        response = await llm.ainvoke(messages)
        drafts.append(response.content)
        
    metadata = state.get("execution_metadata", {})
    metadata["generation_calls"] += num_to_generate
    metadata["nodes_visited"].append("generation")
    
    return {
        "draft_answers": drafts,
        "execution_metadata": metadata
    }

async def synthesize_answer(state: GraphState) -> Dict[str, Any]:
    """Synthesize final response from multiple drafts in Blending mode."""
    drafts = state["draft_answers"]
    if not drafts:
        return {"final_answer": "Failed to generate answer."}
    if len(drafts) == 1:
        return {"final_answer": drafts[0]}
        
    llm = await LangChainFactory.get_llm(state["workspace_id"])
    system_prompt = "Compare the draft answers below. Combine the best elements of both into a final, highly accurate response."
    draft_str = "\n\n".join([f"Draft {i+1}:\n{d}" for i, d in enumerate(drafts)])
    
    response = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=draft_str)])
    
    return {
        "final_answer": response.content,
        "execution_metadata": {**state["execution_metadata"], "nodes_visited": state["execution_metadata"]["nodes_visited"] + ["synthesize"]}
    }

