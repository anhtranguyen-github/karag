from __future__ import annotations

from sqlalchemy import select, delete
from app.infra.db.database import ApiKeyRow, DatabaseManager
from app.modules.api_keys.schemas import ApiKeySummary


def _row_to_summary(row: ApiKeyRow) -> ApiKeySummary:
    summary = ApiKeySummary.model_validate(row)
    # Mask the key: karag_...XYZ
    if row.key_value:
        summary.masked_key = f"{row.key_value[:10]}...{row.key_value[-4:]}"
    return summary


class ApiKeyRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, api_key: ApiKeySummary, key_value: str) -> ApiKeySummary:
        with self.database.session() as session:
            session.add(
                ApiKeyRow(
                    id=api_key.id,
                    organization_id=api_key.organization_id,
                    project_id=api_key.project_id,
                    key_value=key_value,
                    name=api_key.name,
                    is_active=api_key.is_active,
                    created_at=api_key.created_at,
                )
            )
        return api_key

    def get_by_key(self, key_value: str) -> ApiKeySummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(ApiKeyRow).where(
                    ApiKeyRow.key_value == key_value,
                    ApiKeyRow.is_active == True,
                )
            )
            if not row:
                return None
            return _row_to_summary(row)

    def list_for_project(self, organization_id: str, project_id: str) -> list[ApiKeySummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ApiKeyRow).where(
                    ApiKeyRow.organization_id == organization_id,
                    ApiKeyRow.project_id == project_id,
                )
            ).all()
            return [_row_to_summary(row) for row in rows]

    def delete(self, api_key_id: str) -> None:
        with self.database.session() as session:
            session.execute(delete(ApiKeyRow).where(ApiKeyRow.id == api_key_id))
