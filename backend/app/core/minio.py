import io

import structlog
from minio import Minio
from minio.error import S3Error
from backend.app.core.config import karag_settings
from backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class MinioManager:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MinioManager, cls).__new__(cls)
        return cls._instance

    @property
    def client(self):
        if self._client is None:
            logger.info(
                "minio_connect",
                endpoint=karag_settings.MINIO_ENDPOINT,
            )
            self._client = Minio(
                karag_settings.MINIO_ENDPOINT,
                access_key=karag_settings.MINIO_ACCESS_KEY,
                secret_key=karag_settings.MINIO_SECRET_KEY,
                secure=karag_settings.MINIO_SECURE,
            )
        return self._client

    def ensure_bucket(self, bucket_name: str = None):
        bucket = bucket_name or karag_settings.MINIO_BUCKET
        with tracer.start_as_current_span(
            "minio.ensure_bucket",
            attributes={"minio.bucket": bucket},
        ):
            try:
                if not self.client.bucket_exists(bucket):
                    logger.info("minio_bucket_create", bucket=bucket)
                    self.client.make_bucket(bucket)
                    # Production Requirement: Enable Versioning for Data Ops
                    try:
                        from minio.versioningconfig import VersioningConfig
                        from minio.commonconfig import ENABLED

                        self.client.set_bucket_versioning(
                            bucket, VersioningConfig(ENABLED)
                        )
                        logger.info("minio_versioning_enabled", bucket=bucket)
                    except Exception as ve:
                        logger.warning(
                            "minio_versioning_config_failed",
                            bucket=bucket,
                            error=str(ve),
                        )
                else:
                    logger.debug("minio_bucket_exists", bucket=bucket)
            except S3Error as e:
                logger.error("minio_bucket_error", bucket=bucket, error=str(e))
                raise

    async def upload_file(
        self,
        object_name: str,
        data: io.BytesIO,
        length: int,
        content_type: str = "application/octet-stream",
    ):
        """Sync upload wrapper (MinIO client is sync)."""
        self.ensure_bucket()
        with tracer.start_as_current_span(
            "minio.upload",
            attributes={
                "minio.object": object_name,
                "minio.size_bytes": length,
                "minio.content_type": content_type,
            },
        ):
            try:
                self.client.put_object(
                    karag_settings.MINIO_BUCKET,
                    object_name,
                    data,
                    length,
                    content_type=content_type,
                )
                path = f"{karag_settings.MINIO_BUCKET}/{object_name}"
                logger.info(
                    "minio_upload_complete",
                    object=object_name,
                    size_bytes=length,
                )
                return path
            except S3Error as e:
                logger.error("minio_upload_error", object=object_name, error=str(e))
                raise

    def get_file(self, object_name: str):
        """Get file content."""
        # Strip bucket prefix if present (stored minio_path format: bucket/filename)
        bucket_prefix = f"{karag_settings.MINIO_BUCKET}/"
        if object_name.startswith(bucket_prefix):
            object_name = object_name[len(bucket_prefix) :]

        with tracer.start_as_current_span(
            "minio.get_file",
            attributes={"minio.object": object_name},
        ):
            try:
                response = self.client.get_object(
                    karag_settings.MINIO_BUCKET, object_name
                )
                return response.read()
            except Exception as e:
                logger.error("minio_download_error", object=object_name, error=str(e))
                return None
            finally:
                if "response" in locals():
                    response.close()
                    response.release_conn()

    def get_presigned_url(self, object_name: str, expires_hours: int = 1):
        """Generate a presigned URL for preview/download."""
        try:
            # Using integer seconds for 'expires' is most compatible
            url = self.client.presigned_get_object(
                karag_settings.MINIO_BUCKET,
                object_name,
                expires=expires_hours * 3600,
            )

            # Rewrite internal Docker hostname to localhost for host-based client access
            if "karag-minio" in url:
                url = url.replace("karag-minio", "localhost")

            return url
        except Exception as e:
            logger.error(
                "minio_presigned_url_error",
                object=object_name,
                error=str(e),
                error_type=type(e).__name__,
            )
            return None

    def delete_file(self, object_name: str):
        with tracer.start_as_current_span(
            "minio.delete",
            attributes={"minio.object": object_name},
        ):
            try:
                self.client.remove_object(karag_settings.MINIO_BUCKET, object_name)
                logger.info("minio_delete_complete", object=object_name)
            except S3Error as e:
                logger.error("minio_delete_error", object=object_name, error=str(e))


minio_manager = MinioManager()
