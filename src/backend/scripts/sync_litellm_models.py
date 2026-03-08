"""Create litellm model data files and seed database from existing model sources.

This script looks for existing data/openrouter_*.json or data/hf_models.json and
writes litellm_*.json files (if available) and inserts rows into the ModelRow
table with framework="litellm". It's deliberately conservative: it will not
call external APIs.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from uuid import uuid4

# ── bootstrap ----------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SCRIPT_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent.parent
sys.path.insert(0, str(_BACKEND_DIR))

# Load .env so DATABASE_URL etc. are available
_env_file = _PROJECT_ROOT / ".env"
if _env_file.exists():
    with open(_env_file) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.strip().strip("'\"")
            os.environ.setdefault(key.strip(), value)

from app.core.config import PlatformSettings          # noqa: E402
from app.core.database import DatabaseManager, ModelRow  # noqa: E402

DATA_DIR = _PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)


def _truncate(text: str | None, length: int = 500) -> str:
    if not text:
        return ""
    return text[:length]


def _copy_if_exists(src: Path, dst: Path) -> bool:
    if src.exists():
        dst.write_text(src.read_text())
        return True
    return False


def main() -> None:
    # copy existing openrouter files to litellm_* so providers can pick them up
    copied = 0
    open_models = DATA_DIR / "openrouter_models.json"
    open_embeds = DATA_DIR / "openrouter_embeddings.json"
    lit_models = DATA_DIR / "litellm_models.json"
    lit_embeds = DATA_DIR / "litellm_embeddings.json"

    if _copy_if_exists(open_models, lit_models):
        print(f"wrote {lit_models.name} from {open_models.name}")
        copied += 1
    if _copy_if_exists(open_embeds, lit_embeds):
        print(f"wrote {lit_embeds.name} from {open_embeds.name}")
        copied += 1

    settings = PlatformSettings()
    db = DatabaseManager(settings.database_url)
    db.initialize()

    inserted = 0
    with db.session() as session:
        # ingest litellm models (if present)
        if lit_models.exists():
            data = json.loads(lit_models.read_text())
            models_list = data.get("data", []) if isinstance(data, dict) else []
            for m in models_list:
                session.add(ModelRow(
                    id=str(uuid4()),
                    organization_id="org-public",
                    name=m.get("id", "unknown"),
                    type="chat",
                    framework="litellm",
                    description=_truncate(m.get("description")),
                    lifecycle_state="available",
                ))
                inserted += 1

        # ingest litellm embeddings (if present)
        if lit_embeds.exists():
            data = json.loads(lit_embeds.read_text())
            embed_list = data.get("data", []) if isinstance(data, dict) else []
            for m in embed_list:
                session.add(ModelRow(
                    id=str(uuid4()),
                    organization_id="org-public",
                    name=m.get("id", "unknown"),
                    type="embedding",
                    framework="litellm",
                    description=_truncate(m.get("description")),
                    lifecycle_state="available",
                ))
                inserted += 1

    print(f"Inserted {inserted} models (framework=litellm) into DB")


if __name__ == "__main__":
    main()
