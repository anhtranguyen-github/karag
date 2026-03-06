"""
Prompt Registry with Versioning and A/B Testing

Manages prompt templates with:
1. Versioning for reproducibility
2. A/B testing for optimization
3. Performance tracking
4. Dynamic switching
"""

import hashlib
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any

import structlog
from backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class PromptStatus(Enum):
    """Status of a prompt version."""

    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


@dataclass
class PromptVersion:
    """A versioned prompt template."""

    name: str
    version: str
    template: str
    variables: list[str]
    description: str = ""
    status: PromptStatus = PromptStatus.DRAFT
    created_at: datetime = None
    created_by: str = ""
    metrics: dict[str, Any] = None
    tags: dict[str, str] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.metrics is None:
            self.metrics = {
                "uses": 0,
                "avg_latency_ms": 0,
                "success_rate": 1.0,
            }
        if self.tags is None:
            self.tags = {}

    def to_dict(self) -> dict:
        return {
            **asdict(self),
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "PromptVersion":
        data = data.copy()
        data["status"] = PromptStatus(data.get("status", "draft"))
        if data.get("created_at"):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        return cls(**data)


class PromptRegistry:
    """
    Central registry for prompt management.

    Features:
    - Store and retrieve prompts by version
    - A/B testing with user bucketing
    - Performance tracking per version
    - Dynamic promotion/demotion
    """

    def __init__(self, storage_backend: Any | None = None):
        """
        Args:
            storage_backend: Optional storage (MongoDB, Redis, etc.)
                             If None, uses in-memory storage
        """
        self.storage = storage_backend
        self._memory: dict[str, list[PromptVersion]] = {}
        self._active_versions: dict[str, str] = {}  # name -> version
        logger.info("prompt_registry_initialized", persistent=storage_backend is not None)

    async def register(self, prompt: PromptVersion) -> None:
        """
        Register a new prompt version.

        Args:
            prompt: PromptVersion to register
        """
        with tracer.start_as_current_span("prompt.register"):
            if self.storage:
                await self.storage.save_prompt(prompt.to_dict())
            else:
                if prompt.name not in self._memory:
                    self._memory[prompt.name] = []
                self._memory[prompt.name].append(prompt)

            logger.info(
                "prompt_registered",
                name=prompt.name,
                version=prompt.version,
                status=prompt.status.value,
            )

    async def get(
        self,
        name: str,
        version: str = "latest",
        user_id: str | None = None,
    ) -> PromptVersion | None:
        """
        Retrieve a prompt version.

        Args:
            name: Prompt name
            version: "latest", "active", or specific version string
            user_id: Optional user ID for A/B testing

        Returns:
            PromptVersion or None
        """
        with tracer.start_as_current_span("prompt.get"):
            if version == "active":
                return await self._get_active(name, user_id)
            elif version == "latest":
                versions = await self._get_all_versions(name)
                if versions:
                    return max(versions, key=lambda v: v.created_at)
                return None
            else:
                return await self._get_specific(name, version)

    async def _get_active(
        self,
        name: str,
        user_id: str | None = None,
    ) -> PromptVersion | None:
        """Get active version, optionally with A/B testing."""
        versions = await self._get_all_versions(name)
        active = [v for v in versions if v.status == PromptStatus.ACTIVE]

        if not active:
            return None

        if len(active) == 1:
            return active[0]

        # A/B testing: assign user to variant
        if user_id:
            bucket = self._get_user_bucket(user_id, len(active))
            return active[bucket]

        # Random selection if no user_id
        import random

        return random.choice(active)

    def _get_user_bucket(self, user_id: str, num_buckets: int) -> int:
        """Deterministic user bucketing for A/B testing."""
        hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        return hash_val % num_buckets

    async def _get_specific(self, name: str, version: str) -> PromptVersion | None:
        """Get specific version."""
        versions = await self._get_all_versions(name)
        for v in versions:
            if v.version == version:
                return v
        return None

    async def _get_all_versions(self, name: str) -> list[PromptVersion]:
        """Get all versions of a prompt."""
        if self.storage:
            data = await self.storage.get_prompt_versions(name)
            return [PromptVersion.from_dict(d) for d in data]
        else:
            return self._memory.get(name, [])

    async def promote(
        self,
        name: str,
        version: str,
        traffic_percentage: float = 100.0,
    ) -> None:
        """
        Promote a prompt version to active.

        Args:
            name: Prompt name
            version: Version to promote
            traffic_percentage: Percentage of traffic (for canary deployments)
        """
        with tracer.start_as_current_span("prompt.promote"):
            prompt = await self._get_specific(name, version)
            if not prompt:
                raise ValueError(f"Prompt {name}:{version} not found")

            # Demote current active if 100% traffic
            if traffic_percentage >= 100:
                versions = await self._get_all_versions(name)
                for v in versions:
                    if v.status == PromptStatus.ACTIVE:
                        v.status = PromptStatus.DEPRECATED

            prompt.status = PromptStatus.ACTIVE
            await self.register(prompt)

            logger.info(
                "prompt_promoted",
                name=name,
                version=version,
                traffic_percentage=traffic_percentage,
            )

    async def record_outcome(
        self,
        name: str,
        version: str,
        outcome: dict[str, Any],
    ) -> None:
        """
        Record performance metrics for a prompt version.

        Args:
            name: Prompt name
            version: Prompt version
            outcome: Dict with metrics like latency, success, user_rating, etc.
        """
        prompt = await self._get_specific(name, version)
        if not prompt:
            return

        # Update metrics
        metrics = prompt.metrics
        uses = metrics["uses"]

        # Exponential moving average for latency
        new_latency = outcome.get("latency_ms", 0)
        metrics["avg_latency_ms"] = (metrics["avg_latency_ms"] * uses + new_latency) / (uses + 1)

        # Success rate
        success = outcome.get("success", True)
        metrics["success_rate"] = (metrics["success_rate"] * uses + (1.0 if success else 0.0)) / (
            uses + 1
        )

        metrics["uses"] = uses + 1

        # Track user satisfaction if provided
        if "user_rating" in outcome:
            if "avg_rating" not in metrics:
                metrics["avg_rating"] = outcome["user_rating"]
            else:
                metrics["avg_rating"] = (metrics["avg_rating"] * uses + outcome["user_rating"]) / (
                    uses + 1
                )

        await self.register(prompt)

        logger.debug(
            "prompt_outcome_recorded",
            name=name,
            version=version,
            metrics=metrics,
        )

    def list_prompts(self) -> list[str]:
        """List all prompt names."""
        if self.storage:
            # Would need async method
            return []
        return list(self._memory.keys())

    async def compare_versions(
        self,
        name: str,
        metric: str = "success_rate",
    ) -> dict[str, Any]:
        """
        Compare metrics across versions of a prompt.

        Args:
            name: Prompt name
            metric: Metric to compare

        Returns:
            Comparison results
        """
        versions = await self._get_all_versions(name)

        comparison = {}
        for v in versions:
            comparison[v.version] = {
                "status": v.status.value,
                "uses": v.metrics.get("uses", 0),
                "metric": v.metrics.get(metric, 0),
            }

        return {
            "prompt": name,
            "metric": metric,
            "versions": comparison,
            "recommendation": self._generate_recommendation(comparison),
        }

    def _generate_recommendation(self, comparison: dict) -> str:
        """Generate a recommendation based on comparison."""
        active = [(v, d) for v, d in comparison.items() if d["status"] == "active"]

        if len(active) == 2:
            # A/B test in progress
            v1, d1 = active[0]
            v2, d2 = active[1]

            if d1["uses"] > 50 and d2["uses"] > 50:
                winner = v1 if d1["metric"] > d2["metric"] else v2
                return f"Sufficient data collected. Winner: {winner}"
            else:
                return "Continue A/B test to collect more data"

        return "No recommendation available"


class PromptTemplate:
    """
    Wrapper for using registered prompts with variable validation.
    """

    def __init__(
        self,
        registry: PromptRegistry,
        name: str,
        version: str = "active",
    ):
        self.registry = registry
        self.name = name
        self.version = version
        self._prompt: PromptVersion | None = None

    async def load(self, user_id: str | None = None) -> "PromptTemplate":
        """Load the prompt from registry."""
        self._prompt = await self.registry.get(self.name, self.version, user_id)
        if not self._prompt:
            raise ValueError(f"Prompt {self.name}:{self.version} not found")
        return self

    def format(self, **kwargs) -> str:
        """Format the prompt with variables."""
        if not self._prompt:
            raise RuntimeError("Prompt not loaded. Call load() first.")

        # Validate all variables present
        missing = set(self._prompt.variables) - set(kwargs.keys())
        if missing:
            raise ValueError(f"Missing variables: {missing}")

        return self._prompt.template.format(**kwargs)

    def with_examples(self, examples: list[dict[str, str]]) -> str:
        """Add few-shot examples to the prompt."""
        if not self._prompt:
            raise RuntimeError("Prompt not loaded")

        example_text = "\n\n".join(
            [f"Input: {ex['input']}\nOutput: {ex['output']}" for ex in examples]
        )

        return f"{example_text}\n\n{self._prompt.template}"


# Global registry instance
prompt_registry = PromptRegistry()
