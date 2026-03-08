from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar


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
