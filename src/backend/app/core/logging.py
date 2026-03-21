"""Structured logging system with contextual metadata.

Wraps stdlib logging to attach tenant/request context automatically.
Uses contextvars so context flows naturally through async call chains.
"""
from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from typing import Any


# Context variables — set once per request/job, read by all log calls
_log_context: ContextVar[dict[str, Any]] = ContextVar("_log_context", default={})


def set_log_context(**kwargs: Any) -> None:
    """Set structured context for the current async scope (request/job)."""
    current = _log_context.get().copy()
    current.update(kwargs)
    _log_context.set(current)


def clear_log_context() -> None:
    """Clear context at end of request/job."""
    _log_context.set({})


def get_log_context() -> dict[str, Any]:
    """Read current context (for middleware/decorators)."""
    return _log_context.get()


class StructuredFormatter(logging.Formatter):
    """JSON formatter that merges contextvar metadata into every log record."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Merge contextvar metadata
        ctx = _log_context.get()
        if ctx:
            entry["context"] = ctx

        # Merge any extra fields passed via logger.info("msg", extra={...})
        for key in ("request_id", "organization_id", "project_id", "workspace_id",
                     "actor_id", "job_id", "job_type", "duration_ms"):
            val = getattr(record, key, None)
            if val is not None:
                entry.setdefault("context", {})[key] = val

        if record.exc_info and record.exc_info[1]:
            entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(entry, default=str)


class HumanFormatter(logging.Formatter):
    """Human-readable formatter that appends context as key=value pairs."""

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        ctx = _log_context.get()
        if ctx:
            pairs = " ".join(f"{k}={v}" for k, v in ctx.items())
            return f"{base} [{pairs}]"
        return base


def configure_logging(
    level: str = "INFO",
    structured: bool = False,
) -> None:
    """Configure root logger. Called once during application startup.

    Args:
        level: Log level string.
        structured: If True, output JSON. If False, human-readable.
    """
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicates on reload
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if structured:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(HumanFormatter(
            fmt="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
    root.addHandler(handler)
