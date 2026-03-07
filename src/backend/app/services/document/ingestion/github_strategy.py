import os
import shutil
import subprocess  # nosec B404
from typing import Any

from src.backend.app.core.error_codes import AppErrorCode
from src.backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from src.backend.app.services.task.task_service import task_service


class GitHubIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "github_ingestion"

    async def run(self, task_id: str, workspace_id: str, metadata: dict[str, Any]) -> dict[str, Any]:
        from src.backend.app.rag.ingestion import ingestion_pipeline

        repo_url = metadata.get("repo_url")
        branch = metadata.get("branch", "main")

        from src.backend.app.core.path_utils import get_safe_temp_path

        tmp_dir = str(get_safe_temp_path(prefix="git_"))
        os.makedirs(tmp_dir, exist_ok=True)

        try:
            if await task_service.is_cancelled(task_id):
                return {}

            await task_service.update_task(
                task_id,
                status="processing",
                progress=5,
                message=f"Cloning {repo_url}...",
            )

            # Clone repo
            git_path = shutil.which("git") or "git"
            result = subprocess.run(
                [
                    git_path,
                    "clone",
                    "--depth",
                    "1",
                    "--branch",
                    branch,
                    repo_url,
                    tmp_dir,
                ],
                capture_output=True,
                text=True,
                check=False,
            )  # nosec B603 B607

            if result.returncode != 0:
                if "Remote branch" in result.stderr and branch == "main":
                    await task_service.update_task(task_id, message="Main branch not found, trying master...")
                    result = subprocess.run(
                        [
                            git_path,
                            "clone",
                            "--depth",
                            "1",
                            "--branch",
                            "master",
                            repo_url,
                            tmp_dir,
                        ],
                        capture_output=True,
                        text=True,
                        check=False,
                    )  # nosec B603 B607

            if result.returncode != 0:
                raise Exception(f"Git clone failed: {result.stderr}")

            await task_service.update_task(task_id, progress=20, message="Processing repository files...")

            from pathlib import Path

            num_chunks = await ingestion_pipeline._ingest_local_directory(
                Path(tmp_dir),
                metadata={"workspace_id": workspace_id, "source": f"github:{repo_url}"},
            )

            await task_service.update_task(
                task_id,
                status="completed",
                progress=100,
                message=f"GitHub repository processed. Created {num_chunks} chunks.",
                result={"chunks": num_chunks, "repo": repo_url},
            )
            return {"chunks": num_chunks}
        except Exception as e:
            logger.error("github_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(
                task_id,
                error_message=str(e),
                error_code=AppErrorCode.GITHUB_IMPORT_FAILED,
            )
            raise e
        finally:
            if os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir)

