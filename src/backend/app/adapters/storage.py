from __future__ import annotations

from typing import Any

from app.core.ports import StorageProvider, StoredObject

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - dependency injected at runtime
    boto3 = None
    BotoConfig = None
    ClientError = Exception


class _MemoryStorageProvider(StorageProvider):
    def __init__(self, name: str) -> None:
        self.name = name
        self._objects: dict[str, bytes] = {}
        self._metadata: dict[str, dict[str, Any]] = {}

    def store_object(
        self,
        path: str,
        content: bytes,
        content_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StoredObject:
        self._objects[path] = content
        self._metadata[path] = metadata or {}
        return StoredObject(
            path=path,
            size_bytes=len(content),
            content_type=content_type,
            metadata=metadata or {},
        )

    def get_object(self, path: str) -> bytes:
        return self._objects[path]

    def delete_prefix(self, prefix: str) -> None:
        for path in [key for key in self._objects if key.startswith(prefix)]:
            self._objects.pop(path, None)
            self._metadata.pop(path, None)


class _S3CompatibleStorageProvider(_MemoryStorageProvider):
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
        stored = super().store_object(
            path,
            content,
            content_type=content_type,
            metadata=metadata,
        )
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


class MinIOStorageProvider(_S3CompatibleStorageProvider):
    def __init__(
        self,
        *,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str = "karag",
        secure: bool = False,
    ) -> None:
        super().__init__(
            "minio",
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            bucket=bucket,
            secure=secure,
        )


class S3StorageProvider(_S3CompatibleStorageProvider):
    def __init__(
        self,
        *,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str = "karag",
        secure: bool = True,
    ) -> None:
        super().__init__(
            "s3",
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            bucket=bucket,
            secure=secure,
        )


class GoogleCloudStorageProvider(_MemoryStorageProvider):
    def __init__(self) -> None:
        super().__init__("gcs")


class AzureBlobStorageProvider(_MemoryStorageProvider):
    def __init__(self) -> None:
        super().__init__("azure-blob")
