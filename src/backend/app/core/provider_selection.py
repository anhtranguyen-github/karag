from __future__ import annotations


def resolve_embedding_provider_name(model_name: str, default_provider: str) -> str:
    normalized = model_name.lower()
    if normalized.startswith("text-embedding-3"):
        return "openai"
    if "nomic" in normalized or "bge-m3" in normalized:
        return "ollama"
    if "bge-large" in normalized or "llama" in normalized:
        return "vllm"
    return default_provider
