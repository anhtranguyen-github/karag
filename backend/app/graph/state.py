from typing import Annotated, TypedDict, List
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # The messages in the conversation
    messages: Annotated[List[BaseMessage], add_messages]

    # Current workspace ID
    workspace_id: str

    # Summary of the conversation history
    summary: str

    # Retrieved context from RAG
    context: List[str]

    # Internal reasoning steps (for visibility)
    reasoning_steps: List[str]

    # Verification result (if the answer is sufficient)
    is_sufficient: bool

    # Token usage or metadata
    metadata: dict

    # Structured sources for citations
    sources: List[dict]

    # Flags for dynamic routing
    agentic_enabled: bool
