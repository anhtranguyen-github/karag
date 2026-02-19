from typing import List, Optional, TypedDict, Annotated
from operator import add
from backend.app.schemas.execution import RuntimeSettings


class GraphState(TypedDict):
    # Inputs
    query: str
    workspace_id: str
    settings: RuntimeSettings

    # Internal Processing
    intent_analysis: Optional[str]
    generated_queries: Annotated[List[str], add]
    retrieved_results: Annotated[List[dict], add]  # List of chunks/docs
    blended_context: Optional[str]
    final_context: Optional[str]

    # Reflection & Refinement
    confidence_level: float
    loop_count: int
    is_sufficient: bool

    # Outputs
    draft_answers: List[str]
    final_answer: Optional[str]

    # Metadata for Tracing
    execution_metadata: dict
