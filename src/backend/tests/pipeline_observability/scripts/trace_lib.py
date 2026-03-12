from __future__ import annotations
import json
import time
from datetime import datetime
from typing import Any, List, Dict, Optional
from pydantic import BaseModel, Field

class ComponentTrace(BaseModel):
    """Detailed trace for a single component/manager call."""
    component_name: str
    stage: str
    class_name: str
    input_data: Any
    output_data: Any
    latency_ms: float
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class PipelineTrace(BaseModel):
    """Full execution trace of a pipeline run."""
    trace_id: str
    scenario_name: str
    original_input: str
    total_latency_ms: float
    steps: List[ComponentTrace] = Field(default_factory=list)
    final_output: Any
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    def add_step(self, step: ComponentTrace):
        self.steps.append(step)

    def save(self, file_path: str):
        with open(file_path, "w") as f:
            json.dump(self.model_dump(), f, indent=2)

class TraceLogger:
    """Helper to capture timing and wrap data for Trace."""
    
    def __init__(self, scenario_name: str, original_input: str):
        self.trace = PipelineTrace(
            trace_id=f"tr_{int(time.time())}",
            scenario_name=scenario_name,
            original_input=original_input,
            total_latency_ms=0,
            final_output=None
        )
        self._start_total = time.perf_counter()

    def capture(self, stage: str, component: str, cls_name: str, input_val: Any, output_val: Any, start_time: float, metadata: Dict = None):
        latency = (time.perf_counter() - start_time) * 1000
        step = ComponentTrace(
            component_name=component,
            stage=stage,
            class_name=cls_name,
            input_data=input_val,
            output_data=output_val,
            latency_ms=round(latency, 2),
            metadata=metadata or {}
        )
        self.trace.add_step(step)

    def finalize(self, final_output: Any):
        self.trace.total_latency_ms = round((time.perf_counter() - self._start_total) * 1000, 2)
        self.trace.final_output = final_output
        return self.trace
