from operator import add
from typing import Annotated, TypedDict

from backend.app.schemas.execution import RuntimeSettings


class GraphState(TypedDict):
    # Inputs
    query: str
    workspace_id: str
    settings: RuntimeSettings
    history: list[dict]  # Conversation history

    # Internal Processing
    intent_analysis: str | None
    generated_queries: list[str]
    retrieved_results: Annotated[list[dict], add]  # List of chunks/docs
    web_results: Annotated[list[dict], add]  # Results from Tavily/Web
    blended_context: str | None
    final_context: str | None

    # Tooling
    tool_calls: list[dict]
    tool_outputs: list[dict]

    # Reflection & Refinement
    confidence_level: float
    loop_count: int
    is_sufficient: bool

    # Outputs
    draft_answers: list[str]
    final_answer: str | None

    # Metadata for Tracing
    execution_metadata: dict
