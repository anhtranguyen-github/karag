from typing import List, Optional, TypedDict, Annotated
from operator import add
from backend.app.schemas.execution import RuntimeSettings


class GraphState(TypedDict):
    # Inputs
    query: str
    workspace_id: str
    settings: RuntimeSettings
    history: List[dict]  # Conversation history

    # Internal Processing
    intent_analysis: Optional[str]
    generated_queries: List[str]
    retrieved_results: Annotated[List[dict], add]  # List of chunks/docs
    web_results: Annotated[List[dict], add]  # Results from Tavily/Web
    blended_context: Optional[str]
    final_context: Optional[str]

    # Tooling
    tool_calls: List[dict]
    tool_outputs: List[dict]

    # Reflection & Refinement
    confidence_level: float
    loop_count: int
    is_sufficient: bool

    # Outputs
    draft_answers: List[str]
    final_answer: Optional[str]

    # Metadata for Tracing
    execution_metadata: dict
