"""
Usage Logging Service - Block 5: Observability

Provides structured logging, usage tracking, and RAG tracing.

REDACTION: API keys, tokens, and PII are scrubbed before logging.
WORKSPACE ATTRIBUTION: Every log entry includes workspace_id.
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any

import structlog
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.schemas.baas import (
    RAGTrace,
    RetrievedSource,
    UsageLog,
    WorkspaceUsageStats,
)

logger = structlog.get_logger(__name__)


# Fields to redact from logs
SENSITIVE_FIELDS = {
    "api_key",
    "key",
    "token",
    "password",
    "secret",
    "authorization",
    "cookie",
    "x-api-key",
    "access_token",
    "refresh_token",
    "private_key",
    "credential",
}


def redact_sensitive_data(data: dict[str, Any]) -> dict[str, Any]:
    """
    Recursively redact sensitive fields from data.

    Args:
        data: Dictionary to redact

    Returns:
        Redacted dictionary
    """
    if not isinstance(data, dict):
        return data

    redacted = {}
    for key, value in data.items():
        key_lower = key.lower()

        # Check if key contains sensitive terms
        if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
            redacted[key] = "[REDACTED]"
        elif isinstance(value, dict):
            redacted[key] = redact_sensitive_data(value)
        elif isinstance(value, list):
            redacted[key] = [redact_sensitive_data(item) if isinstance(item, dict) else item for item in value]
        else:
            redacted[key] = value

    return redacted


def hash_string(value: str) -> str:
    """Create a one-way hash of a string for privacy."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


class UsageService:
    """
    Service for usage logging and observability.

    FEATURES:
    - Structured request logging with workspace attribution
    - Token usage tracking (prompt, completion, embedding)
    - RAG tracing (retrieved chunks, scores, dataset sources)
    - Aggregated usage statistics

    REDACTION:
    - API keys are never logged
    - Client IPs are hashed
    - Request bodies are scanned for sensitive fields
    """

    @classmethod
    async def log_request(
        cls,
        correlation_id: str,
        workspace_id: str,
        api_key_id: str,
        method: str,
        path: str,
        endpoint: str,
        status_code: int,
        duration_ms: float,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        embedding_tokens: int | None = None,
        rag_trace: RAGTrace | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> UsageLog:
        """
        Log a request with full context.

        This is the primary observability hook called at the end
        of every request.

        Args:
            correlation_id: Request trace ID
            workspace_id: Workspace making the request
            api_key_id: API key used (not the key itself)
            method: HTTP method
            path: Request path
            endpoint: Normalized endpoint name
            status_code: HTTP status code
            duration_ms: Request duration
            prompt_tokens: LLM prompt tokens (if applicable)
            completion_tokens: LLM completion tokens (if applicable)
            embedding_tokens: Embedding tokens (if applicable)
            rag_trace: RAG operation trace (if applicable)
            error_code: Error code (if failed)
            error_message: Error message (if failed)
            client_ip: Client IP address (will be hashed)
            user_agent: User agent string (will be hashed)

        Returns:
            Created UsageLog entry
        """
        db = mongodb_manager.get_async_database()

        # Calculate total tokens
        total_tokens = 0
        if prompt_tokens:
            total_tokens += prompt_tokens
        if completion_tokens:
            total_tokens += completion_tokens
        if embedding_tokens:
            total_tokens += embedding_tokens

        # Hash sensitive client info
        client_ip_hash = hash_string(client_ip) if client_ip else None
        user_agent_hash = hash_string(user_agent) if user_agent else None

        # Create log entry
        log_entry = UsageLog(
            id=f"log_{secrets.token_hex(8)}",
            timestamp=datetime.utcnow(),
            correlation_id=correlation_id,
            workspace_id=workspace_id,
            api_key_id=api_key_id,
            method=method,
            path=path,
            endpoint=endpoint,
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            embedding_tokens=embedding_tokens,
            total_tokens=total_tokens if total_tokens > 0 else None,
            rag_trace=rag_trace,
            error_code=error_code,
            error_message=error_message[:500] if error_message else None,
            client_ip_hash=client_ip_hash,
            user_agent_hash=user_agent_hash,
        )

        # Save to database
        await db.usage_logs.insert_one(log_entry.model_dump())

        # Also log to structured logger
        logger.info(
            "request_logged",
            correlation_id=correlation_id,
            workspace_id=workspace_id,
            endpoint=endpoint,
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            total_tokens=total_tokens if total_tokens > 0 else None,
        )

        return log_entry

    @classmethod
    async def create_rag_trace(
        cls,
        dataset_id: str,
        query: str,
        chunks_retrieved: int,
        retrieval_latency_ms: float,
        sources: list[RetrievedSource],
        context_tokens: int = 0,
        context_documents: int = 0,
        rerank_latency_ms: float | None = None,
    ) -> RAGTrace:
        """
        Create a RAG trace for logging.

        Args:
            dataset_id: The dataset used for retrieval
            query: The original query
            chunks_retrieved: Number of chunks retrieved
            retrieval_latency_ms: Retrieval operation duration
            sources: List of retrieved sources with scores
            context_tokens: Tokens in assembled context
            context_documents: Unique documents in context
            rerank_latency_ms: Reranking duration (if enabled)

        Returns:
            RAGTrace object
        """
        # Truncate query for logging
        query_preview = query[:500] if len(query) > 500 else query

        return RAGTrace(
            dataset_id=dataset_id,
            query=query_preview,
            chunks_retrieved=chunks_retrieved,
            retrieval_latency_ms=round(retrieval_latency_ms, 2),
            sources=sources,
            context_tokens=context_tokens,
            context_documents=context_documents,
            rerank_latency_ms=round(rerank_latency_ms, 2) if rerank_latency_ms else None,
        )

    @classmethod
    async def get_workspace_usage_stats(
        cls,
        workspace_id: str,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
    ) -> WorkspaceUsageStats:
        """
        Get aggregated usage statistics for a workspace.

        Args:
            workspace_id: The workspace to get stats for
            period_start: Start of period (default: 24h ago)
            period_end: End of period (default: now)

        Returns:
            WorkspaceUsageStats
        """
        db = mongodb_manager.get_async_database()

        if period_start is None:
            period_start = datetime.utcnow() - timedelta(days=1)
        if period_end is None:
            period_end = datetime.utcnow()

        # Aggregation pipeline
        pipeline = [
            {
                "$match": {
                    "workspace_id": workspace_id,
                    "timestamp": {"$gte": period_start, "$lte": period_end},
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": 1},
                    "successful_requests": {"$sum": {"$cond": [{"$lt": ["$status_code", 400]}, 1, 0]}},
                    "failed_requests": {"$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}},
                    "total_prompt_tokens": {"$sum": "$prompt_tokens"},
                    "total_completion_tokens": {"$sum": "$completion_tokens"},
                    "total_embedding_tokens": {"$sum": "$embedding_tokens"},
                    "rag_queries": {"$sum": {"$cond": [{"$ifNull": ["$rag_trace", False]}, 1, 0]}},
                    "total_chunks_retrieved": {"$sum": "$rag_trace.chunks_retrieved"},
                    "avg_latency": {"$avg": "$duration_ms"},
                    "latencies": {"$push": "$duration_ms"},
                }
            },
        ]

        result = await db.usage_logs.aggregate(pipeline).to_list(1)

        if not result:
            return WorkspaceUsageStats(
                workspace_id=workspace_id,
                period_start=period_start,
                period_end=period_end,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                total_prompt_tokens=0,
                total_completion_tokens=0,
                total_embedding_tokens=0,
                rag_queries=0,
                total_chunks_retrieved=0,
                avg_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
            )

        stats = result[0]

        # Calculate percentiles
        latencies = sorted(stats.get("latencies", []))
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
        p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0

        return WorkspaceUsageStats(
            workspace_id=workspace_id,
            period_start=period_start,
            period_end=period_end,
            total_requests=stats.get("total_requests", 0),
            successful_requests=stats.get("successful_requests", 0),
            failed_requests=stats.get("failed_requests", 0),
            total_prompt_tokens=stats.get("total_prompt_tokens", 0) or 0,
            total_completion_tokens=stats.get("total_completion_tokens", 0) or 0,
            total_embedding_tokens=stats.get("total_embedding_tokens", 0) or 0,
            rag_queries=stats.get("rag_queries", 0),
            total_chunks_retrieved=stats.get("total_chunks_retrieved", 0) or 0,
            avg_latency_ms=round(stats.get("avg_latency", 0), 2),
            p95_latency_ms=round(p95, 2),
            p99_latency_ms=round(p99, 2),
        )

    @classmethod
    async def query_usage_logs(
        cls,
        workspace_id: str | None = None,
        endpoint: str | None = None,
        status_code: int | None = None,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[UsageLog]:
        """
        Query usage logs with filters.

        Args:
            workspace_id: Filter by workspace
            endpoint: Filter by endpoint
            status_code: Filter by status code
            period_start: Start of period
            period_end: End of period
            limit: Max results
            offset: Pagination offset

        Returns:
            List of UsageLog entries
        """
        db = mongodb_manager.get_async_database()

        # Build query
        query = {}
        if workspace_id:
            query["workspace_id"] = workspace_id
        if endpoint:
            query["endpoint"] = endpoint
        if status_code:
            query["status_code"] = status_code

        # Time range
        time_query = {}
        if period_start:
            time_query["$gte"] = period_start
        if period_end:
            time_query["$lte"] = period_end
        if time_query:
            query["timestamp"] = time_query

        # Execute query
        cursor = db.usage_logs.find(query).sort("timestamp", -1).skip(offset).limit(limit)

        logs = []
        async for doc in cursor:
            logs.append(UsageLog(**doc))

        return logs

    @classmethod
    async def cleanup_old_logs(cls, older_than_days: int = 90) -> int:
        """
        Cleanup old usage logs.

        Args:
            older_than_days: Delete logs older than this

        Returns:
            Number of logs deleted
        """
        db = mongodb_manager.get_async_database()

        cutoff = datetime.utcnow() - timedelta(days=older_than_days)

        result = await db.usage_logs.delete_many({"timestamp": {"$lt": cutoff}})

        if result.deleted_count > 0:
            logger.info(
                "usage_logs_cleaned",
                deleted_count=result.deleted_count,
                older_than_days=older_than_days,
            )

        return result.deleted_count


# Singleton instance
usage_service = UsageService()

