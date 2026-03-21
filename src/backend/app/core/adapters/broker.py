"""In-memory and Redis implementations of the MessageBroker port."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from app.core.ports.message_broker import JobHandler, JobMessage, MessageBroker

logger = logging.getLogger(__name__)


class InMemoryBroker:
    """In-memory message broker for development and testing.

    Processes jobs immediately in the same event loop.
    Suitable for tests and single-process deployments.
    """

    def __init__(self) -> None:
        self.name = "in-memory"
        self._handlers: dict[str, list[JobHandler]] = defaultdict(list)
        self._jobs: list[JobMessage] = []

    async def publish(self, job: JobMessage) -> None:
        self._jobs.append(job)
        logger.info("broker.publish job_type=%s job_id=%s", job.job_type, job.job_id)
        # Dispatch immediately for in-memory mode
        handlers = self._handlers.get(job.job_type, [])
        for handler in handlers:
            try:
                result = handler(job)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                logger.exception("broker.handler_error job_type=%s job_id=%s", job.job_type, job.job_id)

    def subscribe(self, job_type: str, handler: JobHandler) -> None:
        self._handlers[job_type].append(handler)
        logger.info("broker.subscribe job_type=%s handler=%s", job_type, handler.__name__)

    async def start_consuming(self) -> None:
        logger.info("InMemoryBroker: consuming inline (no background loop needed)")

    async def stop(self) -> None:
        logger.info("InMemoryBroker: stopped")


class RedisBroker:
    """Redis Streams-backed message broker for production.

    Uses Redis Streams with consumer groups for reliable delivery.
    Each job_type maps to a stream, handlers are invoked when consuming.
    """

    def __init__(self, redis_url: str, stream_prefix: str = "karag.jobs") -> None:
        self.name = "redis"
        self._stream_prefix = stream_prefix
        self._handlers: dict[str, list[JobHandler]] = defaultdict(list)
        self._running = False
        self._redis = None
        self._consumer_group = "karag-workers"
        self._consumer_name = "worker-1"

        try:
            from redis.asyncio import Redis
            self._redis = Redis.from_url(redis_url, decode_responses=True)
        except Exception:
            logger.warning("RedisBroker: failed to connect, falling back to no-op")

    def _stream_name(self, job_type: str) -> str:
        return f"{self._stream_prefix}.{job_type}"

    async def publish(self, job: JobMessage) -> None:
        if not self._redis:
            logger.warning("RedisBroker: redis unavailable, job dropped job_id=%s", job.job_id)
            return

        stream = self._stream_name(job.job_type)
        data = {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "payload": json.dumps(job.payload),
            "organization_id": job.organization_id,
            "project_id": job.project_id,
            "workspace_id": job.workspace_id,
            "actor_id": job.actor_id,
            "correlation_id": job.correlation_id,
            "created_at": job.created_at,
            "attempt": str(job.attempt),
            "max_retries": str(job.max_retries),
        }
        await self._redis.xadd(stream, data)
        logger.info("broker.publish stream=%s job_id=%s", stream, job.job_id)

    def subscribe(self, job_type: str, handler: JobHandler) -> None:
        self._handlers[job_type].append(handler)

    async def _ensure_groups(self) -> None:
        if not self._redis:
            return
        for job_type in self._handlers:
            stream = self._stream_name(job_type)
            try:
                await self._redis.xgroup_create(stream, self._consumer_group, id="0", mkstream=True)
            except Exception:
                pass  # Group already exists

    async def start_consuming(self) -> None:
        if not self._redis or not self._handlers:
            return
        await self._ensure_groups()
        self._running = True
        logger.info("RedisBroker: consuming from %d stream(s)", len(self._handlers))

        while self._running:
            for job_type, handlers in self._handlers.items():
                stream = self._stream_name(job_type)
                try:
                    entries = await self._redis.xreadgroup(
                        self._consumer_group,
                        self._consumer_name,
                        {stream: ">"},
                        count=10,
                        block=1000,
                    )
                    if not entries:
                        continue
                    for _stream_key, messages in entries:
                        for msg_id, data in messages:
                            job = JobMessage(
                                job_id=data.get("job_id", ""),
                                job_type=data.get("job_type", job_type),
                                payload=json.loads(data.get("payload", "{}")),
                                organization_id=data.get("organization_id", ""),
                                project_id=data.get("project_id", ""),
                                workspace_id=data.get("workspace_id", ""),
                                actor_id=data.get("actor_id", ""),
                                correlation_id=data.get("correlation_id", ""),
                                created_at=data.get("created_at", ""),
                                attempt=int(data.get("attempt", "0")),
                                max_retries=int(data.get("max_retries", "3")),
                            )
                            for handler in handlers:
                                try:
                                    result = handler(job)
                                    if asyncio.iscoroutine(result):
                                        await result
                                except Exception:
                                    logger.exception(
                                        "broker.handler_error job_type=%s job_id=%s",
                                        job.job_type, job.job_id,
                                    )
                            await self._redis.xack(stream, self._consumer_group, msg_id)
                except Exception:
                    logger.exception("broker.consume_error stream=%s", stream)
                    await asyncio.sleep(1)

    async def stop(self) -> None:
        self._running = False
        if self._redis:
            await self._redis.aclose()
        logger.info("RedisBroker: stopped")
