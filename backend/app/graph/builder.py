from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from backend.app.graph.state import AgentState
from backend.app.graph.nodes import retrieval_node, rerank_node, reason_node, generate_node, summarize_node
from backend.app.tools.registry import get_tools

# 1. Initialize Graph
workflow = StateGraph(AgentState)

# 2. Add Nodes
workflow.add_node("retrieve", retrieval_node)
workflow.add_node("rerank", rerank_node)
workflow.add_node("reason", reason_node)
workflow.add_node("tools", ToolNode(get_tools()))
workflow.add_node("generate", generate_node)
workflow.add_node("summarize", summarize_node)

# 3. Define Edges
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "reason")

def should_continue(state: AgentState):
    """Router to decide between tools and final generation."""
    last_message = state["messages"][-1]
    if getattr(last_message, "tool_calls", None):
        return "tools"
    return "generate"

workflow.add_conditional_edges(
    "reason",
    should_continue,
    {
        "tools": "tools",
        "generate": "generate"
    }
)

workflow.add_edge("tools", "reason")

def should_summarize(state: AgentState):
    """Router to decide if history should be summarized."""
    # We summarize if history is getting long (> 6 messages)
    if len(state["messages"]) > 6:
        return "summarize"
    return END

workflow.add_conditional_edges(
    "generate",
    should_summarize,
    {
        "summarize": "summarize",
        END: END
    }
)

workflow.add_edge("summarize", END)

from langgraph.checkpoint.mongodb import MongoDBSaver
from backend.app.core.config import ai_settings
from backend.app.core.mongodb import mongodb_manager

# 4. Compile with Persistence
checkpointer = MongoDBSaver(mongodb_manager.client, db_name=ai_settings.MONGO_DB)
app = workflow.compile(checkpointer=checkpointer)
