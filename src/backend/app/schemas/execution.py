from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class ExecutionMode(StrEnum):
    AUTO = "auto"
    FAST = "fast"
    THINK = "think"
    DEEP = "deep"

    @classmethod
    def _missing_(cls, value):
        if value == "thinking":
            return cls.THINK
        if value == "blending":
            return cls.AUTO
        return cls.AUTO


class AutoModeConfig(BaseModel):
    max_loops: int = 3
    timeout_ms: int = Field(default=60000, ge=1000)


class FastModeConfig(BaseModel):
    max_loops: int = 1
    enable_reflection: bool = False
    timeout_ms: int = Field(default=30000, ge=1000)


class ThinkModeConfig(BaseModel):
    max_loops: int = Field(default=5, ge=1, le=10)
    reflection_depth: int = Field(default=3, ge=1, le=5)
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    timeout_ms: int = Field(default=90000, ge=1000)


class DeepModeConfig(BaseModel):
    max_loops: int = Field(default=10, ge=1, le=20)
    multi_query_limit: int = Field(default=5, ge=1, le=10)
    backtracking_enabled: bool = True
    timeout_ms: int = Field(default=180000, ge=1000)


class TracingConfig(BaseModel):
    tracing_enabled: bool = True
    trace_level: Literal["basic", "detailed", "debug"] = "detailed"
    store_intermediate_results: bool = True
    explainability_mode: bool = True
    debug_node_outputs: bool = False


class RuntimeSettings(BaseModel):
    mode: ExecutionMode = ExecutionMode.AUTO
    auto: AutoModeConfig = Field(default_factory=AutoModeConfig)
    fast: FastModeConfig = Field(default_factory=FastModeConfig)
    think: ThinkModeConfig = Field(default_factory=ThinkModeConfig)
    deep: DeepModeConfig = Field(default_factory=DeepModeConfig)
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
            ExecutionMode.AUTO: self.auto,
            ExecutionMode.FAST: self.fast,
            ExecutionMode.THINK: self.think,
            ExecutionMode.DEEP: self.deep,
        }
        config = mode_configs.get(self.mode, self.auto)
        return getattr(config, "max_loops", 1)


class ChasingData(BaseModel):
    execution_mode: ExecutionMode
    loops: int = 0
    queries: list[str] = []
    retrieval_calls: int = 0
    generation_calls: int = 0
    final_confidence: float | None = None
    duration_ms: float = 0.0
