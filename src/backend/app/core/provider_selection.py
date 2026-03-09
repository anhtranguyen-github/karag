from __future__ import annotations


def resolve_embedding_provider_name(model_name: str, default_provider: str) -> str:
    # Prefer litellm for most providers so that paid APIs (OpenAI/Anthropic)
    # and local vLLM can be routed through the same integration layer.
    normalized = model_name.lower()
    if normalized.startswith("text-embedding-3"):
        return "litellm"
    if "nomic" in normalized or "bge" in normalized or "llama" in normalized:
        return "vllm"
    return default_provider or "litellm"
