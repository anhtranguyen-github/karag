from __future__ import annotations

import importlib
from typing import Any, Type
from dataclasses import dataclass
from typing import Generic, TypeVar

from app.adapters import plugins


def _import_class(path: str) -> Type[Any]:
    """Import a class given its full path like 'module.sub.ClassName'."""
    module_path, _, class_name = path.rpartition(".")
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def list_storage_providers() -> list[str]:
    return sorted(list(plugins.STORAGE_PROVIDERS.keys()))


def get_storage_provider(provider_key: str, **kwargs: Any) -> Any:
    """Return an instantiated storage provider for the given key.

    The provider class is looked up from `app.adapters.plugins.STORAGE_PROVIDERS`.
    """
    path = plugins.STORAGE_PROVIDERS.get(provider_key)
    if not path:
        raise KeyError(f"Unknown storage provider: {provider_key}")
    # Cache instantiated storage provider instances so repeated calls for the
    # same logical provider return the same in-memory/client instance. This
    # ensures uploads and retrievals during tests use the same provider object.
    if not hasattr(get_storage_provider, "_instances"):
        setattr(get_storage_provider, "_instances", {})
    instances: dict[str, Any] = getattr(get_storage_provider, "_instances")
    if provider_key in instances:
        return instances[provider_key]
    klass = _import_class(path)
    instance = klass(**kwargs)
    instances[provider_key] = instance
    return instance


def list_vector_stores() -> list[str]:
    return sorted(list(plugins.VECTOR_STORES.keys()))


def get_vector_store(store_key: str, **kwargs: Any) -> Any:
    """Return an instantiated vector store for the given key.

    The class is looked up from `app.adapters.plugins.VECTOR_STORES`.
    """
    path = plugins.VECTOR_STORES.get(store_key)
    if not path:
        raise KeyError(f"Unknown vector store: {store_key}")
    # Cache instantiated vector store instances so repeated calls with the
    # same logical store key return the same in-memory/remote-backed client.
    if not hasattr(get_vector_store, "_instances"):
        setattr(get_vector_store, "_instances", {})
    instances: dict[str, Any] = getattr(get_vector_store, "_instances")
    if store_key in instances:
        return instances[store_key]
    klass = _import_class(path)
    instance = klass(**kwargs)
    instances[store_key] = instance
    return instance


T = TypeVar("T")


@dataclass(slots=True)
class ProviderRegistry(Generic[T]):
    default_name: str
    providers: dict[str, T]

    def get(self, name: str | None = None) -> T:
        resolved_name = name or self.default_name
        try:
            return self.providers[resolved_name]
        except KeyError as exc:
            known = ", ".join(sorted(self.providers))
            raise KeyError(f"Unknown provider '{resolved_name}'. Known providers: {known}") from exc

    def names(self) -> list[str]:
        return sorted(self.providers)
