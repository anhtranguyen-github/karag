from langgraph.graph import StateGraph, END
from backend.app.rag.graph.state import GraphState
from backend.app.schemas.execution import ExecutionMode
from backend.app.rag.graph.nodes import (
    init_execution,
    analyze_intent,
    build_query_context,
    retrieve_context,
    blend_results,
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
    workflow.add_node("blend", blend_results)
    workflow.add_node("reflect", reflect_and_decide)
    workflow.add_node("assemble", assemble_context)
    workflow.add_node("generate", generate_answer)
    workflow.add_node("synthesize", synthesize_answer)

    # 2. Define Edges & Routing Logic
    workflow.set_entry_point("init")

    # Flow: Init -> Analyze (Context dependent) or Retrieve (FAST mode)
    def init_router(state: GraphState):
        if state["settings"].execution_mode == ExecutionMode.FAST:
            return "retrieve"
        return "analyze"

    workflow.add_conditional_edges(
        "init", init_router, {"retrieve": "retrieve", "analyze": "analyze"}
    )

    # Flow: Analyze -> Build Query
    workflow.add_edge("analyze", "build_query")

    # Flow: Build Query -> Retrieve
    workflow.add_edge("build_query", "retrieve")

    # Flow: Retrieve -> Blend
    workflow.add_edge("retrieve", "blend")

    # Conditional Branch: Reflection
    def should_reflect(state: GraphState):
        if state["settings"].execution_mode in [
            ExecutionMode.AUTO,
            ExecutionMode.THINK,
            ExecutionMode.DEEP,
        ]:
            return "reflect"
        return "assemble"

    workflow.add_conditional_edges(
        "blend", should_reflect, {"reflect": "reflect", "assemble": "assemble"}
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

    # Conditional Branch: Synthesis (Kept as fallback to END for now)
    def should_synthesize(state: GraphState):
        return END

    workflow.add_conditional_edges("generate", should_synthesize, {END: END})

    workflow.add_edge("synthesize", END)

    return workflow.compile()


# Singleton instance
rag_executor = build_rag_graph()
