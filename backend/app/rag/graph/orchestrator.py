from langgraph.graph import StateGraph, END
from backend.app.rag.graph.state import GraphState
from backend.app.schemas.execution import ExecutionMode
from backend.app.rag.graph.nodes import (
    init_execution,
    analyze_intent,
    build_query_context,
    retrieve_context,
    web_search,
    blend_results,
    rerank_results,
    reflect_and_decide,
    assemble_context,
    generate_answer,
    synthesize_answer,
)


def build_rag_graph():
    """Build the LangGraph execution graph for RAG."""
    workflow = StateGraph(GraphState)

    # 1. Add Nodes
    workflow.add_node("init", init_execution)
    workflow.add_node("analyze", analyze_intent)
    workflow.add_node("build_query", build_query_context)
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("web_search", web_search)
    workflow.add_node("blend", blend_results)
    workflow.add_node("rerank", rerank_results)
    workflow.add_node("reflect", reflect_and_decide)
    workflow.add_node("assemble", assemble_context)
    workflow.add_node("generate", generate_answer)
    workflow.add_node("synthesize", synthesize_answer)

    # 2. Define Edges & Routing Logic
    workflow.set_entry_point("init")

    # Flow: Init -> Analyze
    workflow.add_edge("init", "analyze")

    # Flow: Analyze -> Build Query or Assemble (for direct/greetings)
    def analyze_router(state: GraphState):
        intent = state.get("intent_analysis", "").lower()
        # Direct means no retrieval, no search
        if "[strategy: direct]" in intent or "greeting" in intent:
            return "assemble"
        return "build_query"

    workflow.add_conditional_edges(
        "analyze", 
        analyze_router, 
        {"build_query": "build_query", "assemble": "assemble"}
    )

    # Flow: Build Query -> Retrieve
    workflow.add_edge("build_query", "retrieve")

    # Flow: Retrieve -> Web Search
    workflow.add_edge("retrieve", "web_search")

    # Flow: Web Search -> Blend -> Rerank
    workflow.add_edge("web_search", "blend")
    workflow.add_edge("blend", "rerank")

    # Conditional Branch: Reflection
    def should_reflect(state: GraphState):
        mode = state["settings"].execution_mode
        # In AUTO, we can skip reflection if it was a simple Direct/Web hit, but for now reflect for consistency
        if mode in [
            ExecutionMode.AUTO,
            ExecutionMode.THINK,
            ExecutionMode.DEEP,
        ]:
            return "reflect"
        return "assemble"

    workflow.add_conditional_edges(
        "rerank", should_reflect, {"reflect": "reflect", "assemble": "assemble"}
    )

    # Conditional Branch: To Loop or Not to Loop
    def loop_decision(state: GraphState):
        if state["is_sufficient"]:
            return "assemble"
        return "build_query"

    workflow.add_conditional_edges(
        "reflect", loop_decision, {"assemble": "assemble", "build_query": "build_query"}
    )

    # Flow: Assemble -> Generate
    workflow.add_edge("assemble", "generate")

    # Flow: Generate -> Synthesize -> END
    workflow.add_edge("generate", "synthesize")
    workflow.add_edge("synthesize", END)

    return workflow.compile()


# Singleton instance
rag_executor = build_rag_graph()
