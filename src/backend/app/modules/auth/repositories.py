from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select

from app.core.database import DatabaseManager, UserRow, SessionRow
from app.modules.auth.schemas import UserSummary


class AuthRepository:
    def __init__(self, db: DatabaseManager) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> UserRow | None:
        with self.db.session() as session:
            return session.scalar(select(UserRow).where(UserRow.email == email))

    def get_user_by_id(self, user_id: str) -> UserRow | None:
        with self.db.session() as session:
            return session.get(UserRow, user_id)

    def create_user(self, email: str, hashed_password: str, full_name: str | None = None, organization_id: str | None = None) -> UserSummary:
        user_id = str(uuid4())
        user = UserRow(
            id=user_id,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            organization_id=organization_id,
            is_active=True
        )
        with self.db.session() as session:
            session.add(user)
            session.flush()
            return UserSummary.from_orm(user)

    def create_session(self, user_id: str, token: str, expires_at: any) -> None:
        session_row = SessionRow(
            id=str(uuid4()),
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        with self.db.session() as session:
            session.add(session_row)

    def get_session_by_token(self, token: str) -> SessionRow | None:
        with self.db.session() as session:
            return session.scalar(select(SessionRow).where(SessionRow.token == token))

    def delete_session(self, token: str) -> None:
        with self.db.session() as session:
            row = session.scalar(select(SessionRow).where(SessionRow.token == token))
            if row:
                session.delete(row)


class RoleRepository:
    def __init__(self, db: DatabaseManager) -> None:
        self.db = db

    def get_role_by_name(self, name: str):
        from app.core.database import RoleRow
        with self.db.session() as session:
            return session.scalar(select(RoleRow).where(RoleRow.name == name))

    def get_role_by_id(self, role_id: str):
        from app.core.database import RoleRow
        with self.db.session() as session:
            return session.get(RoleRow, role_id)


class MembershipRepository:
    def __init__(self, db: DatabaseManager) -> None:
        self.db = db

    def list_user_memberships(self, user_id: str):
        from app.core.database import MembershipRow
        with self.db.session() as session:
            return session.scalars(
                select(MembershipRow).where(MembershipRow.user_id == user_id)
            ).all()

    def add_membership(self, user_id: str, organization_id: str, role_id: str, project_id: str | None = None):
        from app.core.database import MembershipRow
        membership = MembershipRow(
            id=str(uuid4()),
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            role_id=role_id
        )
        with self.db.session() as session:
            session.add(membership)
        return membership
