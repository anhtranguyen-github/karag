from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # The messages in the conversation
    messages: Annotated[list[BaseMessage], add_messages]

    # Current workspace ID
    workspace_id: str

    # Summary of the conversation history
    summary: str

    # Retrieved context from RAG
    context: list[str]

    # Internal reasoning steps (for visibility)
    reasoning_steps: list[str]

    # Verification result (if the answer is sufficient)
    is_sufficient: bool

    # Token usage or metadata
    metadata: dict

    # Structured sources for citations
    sources: list[dict]

    # Flags for dynamic routing
    agentic_enabled: bool
