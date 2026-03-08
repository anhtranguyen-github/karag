"""Fetch models, embedding models, and providers from OpenRouter and persist to DB."""
from __future__ import annotations

import json
import os
import sys
import urllib.request
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

ENDPOINTS = {
    "models":     "https://openrouter.ai/api/v1/models",
    "embeddings": "https://openrouter.ai/api/v1/embeddings/models",
    "providers":  "https://openrouter.ai/api/v1/providers",
}


# ── helpers -------------------------------------------------------------------

def _fetch(url: str, api_key: str | None = None) -> dict | list | None:
    headers: dict[str, str] = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  ⚠ {url}: {exc}")
        return None


def _truncate(text: str | None, length: int = 500) -> str:
    if not text:
        return ""
    return text[:length]


# ── main ----------------------------------------------------------------------

def main() -> None:
    api_key = os.getenv("OPENROUTER_API_KEY", "")

    # 1) Fetch & save JSON ─────────────────────────────────────────────────────
    fetched: dict[str, dict | list] = {}
    for key, url in ENDPOINTS.items():
        print(f"Fetching {key}...")
        data = _fetch(url, api_key or None)
        if data is not None:
            fetched[key] = data
            dest = DATA_DIR / f"openrouter_{key}.json"
            dest.write_text(json.dumps(data, indent=2))
            print(f"  ✓ saved → {dest.relative_to(_PROJECT_ROOT)}")

    # 2) Ingest into database ──────────────────────────────────────────────────
    settings = PlatformSettings()
    db = DatabaseManager(settings.database_url)
    db.initialize()  # ensure tables exist

    # Clear stale org-public/openrouter rows before re-inserting
    from sqlalchemy import delete, and_
    with db.session() as session:
        session.execute(
            delete(ModelRow).where(
                and_(
                    ModelRow.organization_id == "org-public",
                    ModelRow.framework == "openrouter",
                )
            )
        )

    inserted = 0
    with db.session() as session:
        # ── chat / text-generation models ─────────────────────────────────
        models_list = (fetched.get("models") or {}).get("data", [])
        for m in models_list:
            session.add(ModelRow(
                id=str(uuid4()),
                organization_id="org-public",
                name=m.get("id", "unknown"),
                type="chat",
                framework="openrouter",
                description=_truncate(m.get("description")),
                lifecycle_state="available",
            ))
            inserted += 1

        # ── embedding models ──────────────────────────────────────────────
        embed_list = (fetched.get("embeddings") or {}).get("data", [])
        for m in embed_list:
            session.add(ModelRow(
                id=str(uuid4()),
                organization_id="org-public",
                name=m.get("id", "unknown"),
                type="embedding",
                framework="openrouter",
                description=_truncate(m.get("description")),
                lifecycle_state="available",
            ))
            inserted += 1

    print(f"  ✓ {inserted} models written to database")

    # 3) Also ingest hf_models.json if present ─────────────────────────────────
    hf_path = DATA_DIR / "hf_models.json"
    if hf_path.exists():
        with db.session() as session:
            # Check if already seeded
            from sqlalchemy import select, func
            count = session.scalar(
                select(func.count()).where(
                    ModelRow.organization_id == "org-public",
                    ModelRow.framework != "openrouter",
                )
            )
            if count and count > 0:
                print(f"  ℹ HF models already seeded ({count} rows), skipping")
            else:
                hf_data = json.loads(hf_path.read_text())
                hf_count = 0
                for item in hf_data:
                    session.add(ModelRow(
                        id=str(uuid4()),
                        organization_id="org-public",
                        name=item.get("name", "unknown"),
                        type=item.get("pipeline_tag", "text-generation"),
                        framework=item.get("architecture", "hf"),
                        description=_truncate(item.get("use_case")),
                        lifecycle_state="available",
                    ))
                    hf_count += 1
                print(f"  ✓ {hf_count} HF models written to database")

    print("Done.")


if __name__ == "__main__":
    main()
