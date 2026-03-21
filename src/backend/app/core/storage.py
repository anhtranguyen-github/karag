from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    BotoConfig = None
    ClientError = Exception


@dataclass(slots=True)
class StoredObject:
    path: str
    size_bytes: int
    content_type: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class StorageProvider(ABC):
    name: str

    @abstractmethod
    def store_object(
        self,
        path: str,
        content: bytes,
        content_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StoredObject:
        raise NotImplementedError

    @abstractmethod
    def get_object(self, path: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete_prefix(self, prefix: str) -> None:
        raise NotImplementedError


class MemoryStorageProvider(StorageProvider):
    def __init__(self, name: str = "memory") -> None:
        self.name = name
        self._storage: dict[str, bytes] = {}
        self._metadata: dict[str, dict[str, Any]] = {}

    def store_object(
        self,
        path: str,
        content: bytes,
        content_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StoredObject:
        self._storage[path] = content
        self._metadata[path] = metadata or {}
        return StoredObject(
            path=path,
            size_bytes=len(content),
            content_type=content_type,
            metadata=self._metadata[path],
        )

    def get_object(self, path: str) -> bytes:
        if path not in self._storage:
            raise FileNotFoundError(f"Object {path} not found")
        return self._storage[path]

    def delete_prefix(self, prefix: str) -> None:
        keys_to_delete = [k for k in self._storage.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._storage[k]
            del self._metadata[k]


class S3CompatibleStorageProvider(MemoryStorageProvider):
    def __init__(
        self,
        name: str,
        *,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str = "karag",
        secure: bool = False,
    ) -> None:
        super().__init__(name)
        self.bucket = bucket
        self._client = None
        
        endpoint = endpoint or os.getenv("MINIO_ENDPOINT")
        access_key = access_key or os.getenv("MINIO_ACCESS_KEY")
        secret_key = secret_key or os.getenv("MINIO_SECRET_KEY")
        
        if boto3 and endpoint and access_key and secret_key and BotoConfig:
            try:
                endpoint_url = endpoint if endpoint.startswith("http") else (
                    ("https://" if secure else "http://") + endpoint
                )
                self._client = boto3.client(
                    "s3",
                    endpoint_url=endpoint_url,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    region_name="us-east-1",
                    config=BotoConfig(s3={"addressing_style": "path"}),
                )
                self._ensure_bucket()
            except Exception:
                self._client = None

    def _ensure_bucket(self) -> None:
        if not self._client:
            return
        try:
            self._client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self.bucket)

    def store_object(
        self,
        path: str,
        content: bytes,
        content_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StoredObject:
        stored = super().store_object(path, content, content_type, metadata)
        if not self._client:
            return stored
        self._ensure_bucket()
        self._client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=content,
            ContentType=content_type or "application/octet-stream",
            Metadata={key: str(value) for key, value in (metadata or {}).items()},
        )
        return stored

    def get_object(self, path: str) -> bytes:
        if not self._client:
            return super().get_object(path)
        response = self._client.get_object(Bucket=self.bucket, Key=path)
        return response["Body"].read()

    def delete_prefix(self, prefix: str) -> None:
        super().delete_prefix(prefix)
        if not self._client:
            return
        continuation_token: str | None = None
        while True:
            params = {"Bucket": self.bucket, "Prefix": prefix}
            if continuation_token:
                params["ContinuationToken"] = continuation_token
            response = self._client.list_objects_v2(**params)
            contents = response.get("Contents", [])
            if contents:
                self._client.delete_objects(
                    Bucket=self.bucket,
                    Delete={
                        "Objects": [{"Key": item["Key"]} for item in contents],
                        "Quiet": True,
                    },
                )
            if not response.get("IsTruncated"):
                break
            continuation_token = response.get("NextContinuationToken")
