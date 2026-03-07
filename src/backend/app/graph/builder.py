from src.backend.app.graph.nodes import (
    generate_node,
    reason_node,
    rerank_node,
    retrieval_node,
    summarize_node,
)
from src.backend.app.graph.state import AgentState
from langgraph.graph import END, START, StateGraph

# 1. Initialize Graph
workflow = StateGraph(AgentState)

# 2. Add Nodes
workflow.add_node("retrieve", retrieval_node)
workflow.add_node("rerank", rerank_node)
workflow.add_node("reason", reason_node)
workflow.add_node("generate", generate_node)
workflow.add_node("summarize", summarize_node)

# 3. Define Edges
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "rerank")


def should_reason(state: AgentState):
    """Router to decide if we should use the agentic reasoning loop."""
    if state.get("agentic_enabled", True):
        return "reason"
    return "generate"


workflow.add_conditional_edges("rerank", should_reason, {"reason": "reason", "generate": "generate"})


def should_continue(state: AgentState):
    """Router to decide next steps. Always goes to generate now as tools are removed."""
    return "generate"


workflow.add_conditional_edges("reason", should_continue, {"generate": "generate"})


def should_summarize(state: AgentState):
    """Router to decide if history should be summarized."""
    # We summarize if history is getting long (> 6 messages)
    if len(state["messages"]) > 6:
        return "summarize"
    return END


workflow.add_conditional_edges("generate", should_summarize, {"summarize": "summarize", END: END})

workflow.add_edge("summarize", END)

# 4. Compile with Persistence (Lazy loaded)
_app = None


def get_graph_app():
    global _app
    if _app is None:
        from src.backend.app.core.config import karag_settings
        from src.backend.app.core.mongodb import mongodb_manager
        from langgraph.checkpoint.mongodb import MongoDBSaver

        # Compile with Persistence
        checkpointer = MongoDBSaver(mongodb_manager.client, db_name=karag_settings.MONGO_DB)
        _app = workflow.compile(checkpointer=checkpointer)
    return _app


# For backward compatibility with existing imports
# We create a proxy that calls get_graph_app() or just use the function
class AppProxy:
    async def ainvoke(self, *args, **kwargs):
        app = get_graph_app()
        return await app.ainvoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(get_graph_app(), name)


app = AppProxy()

