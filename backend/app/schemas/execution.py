from enum import Enum
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class ExecutionMode(str, Enum):
    FAST = "fast"
    THINKING = "thinking"
    DEEP = "deep"
    BLENDING = "blending"

class FastModeConfig(BaseModel):
    max_loops: int = 1
    enable_reflection: bool = False
    timeout_ms: int = Field(default=30000, ge=1000)

class ThinkingModeConfig(BaseModel):
    max_loops: int = Field(default=3, ge=1, le=10)
    reflection_depth: int = Field(default=2, ge=1, le=5)
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    timeout_ms: int = Field(default=60000, ge=1000)

class DeepThinkingModeConfig(BaseModel):
    max_loops: int = Field(default=5, ge=1, le=15)
    multi_query_limit: int = Field(default=3, ge=1, le=10)
    backtracking_enabled: bool = True
    timeout_ms: int = Field(default=120000, ge=1000)

class BlendingModeConfig(BaseModel):
    query_variants: int = Field(default=2, ge=1, le=5)
    answer_variants: int = Field(default=2, ge=1, le=5)
    synthesis_strategy: Literal["most_complete", "consensus", "concatenation"] = "most_complete"
    timeout_ms: int = Field(default=90000, ge=1000)

class TracingConfig(BaseModel):
    tracing_enabled: bool = True
    trace_level: Literal["basic", "detailed", "debug"] = "detailed"
    store_intermediate_results: bool = True
    explainability_mode: bool = True
    debug_node_outputs: bool = False

class RuntimeSettings(BaseModel):
    mode: ExecutionMode = ExecutionMode.FAST
    fast: FastModeConfig = Field(default_factory=FastModeConfig)
    thinking: ThinkingModeConfig = Field(default_factory=ThinkingModeConfig)
    deep: DeepThinkingModeConfig = Field(default_factory=DeepThinkingModeConfig)
    blending: BlendingModeConfig = Field(default_factory=BlendingModeConfig)
    tracing: TracingConfig = Field(default_factory=TracingConfig)
    stream_thoughts: bool = True

    # --- Compatibility properties for graph nodes/orchestrator ---
    @property
    def execution_mode(self) -> ExecutionMode:
        return self.mode

    @property
    def max_loops(self) -> int:
        """Return max_loops for the active execution mode."""
        mode_configs = {
            ExecutionMode.FAST: self.fast,
            ExecutionMode.THINKING: self.thinking,
            ExecutionMode.DEEP: self.deep,
            ExecutionMode.BLENDING: self.blending,
        }
        config = mode_configs.get(self.mode, self.fast)
        return getattr(config, "max_loops", 1)

class ChasingData(BaseModel):
    execution_mode: ExecutionMode
    loops: int = 0
    queries: List[str] = []
    retrieval_calls: int = 0
    generation_calls: int = 0
    final_confidence: Optional[float] = None
    duration_ms: float = 0.0
