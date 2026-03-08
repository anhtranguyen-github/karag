from __future__ import annotations

from sqlalchemy import select

from app.core.database import DatabaseManager, OrganizationRow, ProjectRow
from app.modules.organizations.schemas import OrganizationSummary, ProjectSummary


def _organization_to_schema(row: OrganizationRow) -> OrganizationSummary:
    return OrganizationSummary(
        id=row.id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
    )


def _project_to_schema(row: ProjectRow) -> ProjectSummary:
    return ProjectSummary(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
    )


class OrganizationRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, organization: OrganizationSummary) -> OrganizationSummary:
        with self.database.session() as session:
            session.add(
                OrganizationRow(
                    id=organization.id,
                    name=organization.name,
                    description=organization.description,
                    created_at=organization.created_at,
                )
            )
        return organization

    def list(self) -> list[OrganizationSummary]:
        with self.database.session() as session:
            rows = session.scalars(select(OrganizationRow)).all()
        return [_organization_to_schema(row) for row in rows]

    def get(self, organization_id: str) -> OrganizationSummary | None:
        with self.database.session() as session:
            row = session.scalar(select(OrganizationRow).where(OrganizationRow.id == organization_id))
        return _organization_to_schema(row) if row else None


class ProjectRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, project: ProjectSummary) -> ProjectSummary:
        with self.database.session() as session:
            session.add(
                ProjectRow(
                    id=project.id,
                    organization_id=project.organization_id,
                    name=project.name,
                    description=project.description,
                    created_at=project.created_at,
                )
            )
        return project

    def list_for_organization(self, organization_id: str) -> list[ProjectSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ProjectRow).where(ProjectRow.organization_id == organization_id)
            ).all()
        return [_project_to_schema(row) for row in rows]

    def get(self, organization_id: str, project_id: str) -> ProjectSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(ProjectRow).where(
                    ProjectRow.id == project_id,
                    ProjectRow.organization_id == organization_id,
                )
            )
        return _project_to_schema(row) if row else None
