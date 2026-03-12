from __future__ import annotations

import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from fastapi import HTTPException, status

from app.modules.auth.repositories import AuthRepository
from app.modules.auth.schemas import EffectivePermissionsSummary, ScopeMemberSummary, Token, UserSummary


class AuthService:
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager
        self.repository: AuthRepository = karag_manager.auth_repository
        self.secret_key = getattr(karag_manager.settings, "secret_key", None) or os.getenv("JWT_SECRET", "dev-secret")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 1 day

    def hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def login(self, email: str, password: str) -> Token:
        user = self.repository.get_user_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        expires_at = datetime.now(UTC) + timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user.id, "email": user.email, "org": user.organization_id},
            expires_delta=timedelta(minutes=self.access_token_expire_minutes)
        )
        
        # Optionally store session in DB
        self.repository.create_session(user.id, access_token, expires_at)
        
        return Token(access_token=access_token, expires_at=expires_at)

    def register(self, email: str, password: str, full_name: str | None = None, organization_id: str | None = None) -> UserSummary:
        if self.repository.get_user_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pw = self.hash_password(password)
        return self.repository.create_user(email, hashed_pw, full_name, organization_id)

    def get_current_user(self, token: str) -> UserSummary:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserSummary.model_validate(user)
    def attach_role_to_user(
        self, 
        user_id: str, 
        organization_id: str, 
        role_name: str, 
        project_id: str | None = None
    ):
        role = self.karag_manager.roles.get_role_by_name(role_name)
        if not role:
            raise HTTPException(status_code=404, detail=f"Role {role_name} not found")
        
        return self.karag_manager.memberships.add_membership(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            role_id=role.id
        )

    def _check_membership_manage_access(
        self,
        actor_id: str,
        organization_id: str,
        project_id: str | None = None,
    ) -> None:
        permissions = self.karag_manager.access_service.get_effective_permissions(
            actor_id,
            organization_id,
            project_id,
        )
        if project_id:
            if "project.edit" not in permissions and "org.admin" not in permissions:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
            return
        if "org.admin" not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    def _to_scope_member_summary(self, membership: Any, project_id: str | None = None) -> ScopeMemberSummary:
        role = self.karag_manager.roles.get_role_by_id(membership.role_id)
        role_name = role.name if role else "unknown"
        user = self.repository.get_user_by_id(membership.user_id)
        inherited = membership.project_id is None and project_id is not None
        display_name = user.full_name if user and user.full_name else membership.user_id
        email = user.email if user else membership.user_id
        return ScopeMemberSummary(
            id=membership.id,
            user_id=membership.user_id,
            email=email,
            display_name=display_name,
            role=role_name,
            mfa_enabled=False,
            organization_id=membership.organization_id,
            project_id=membership.project_id,
            inherited=inherited,
            created_at=membership.created_at,
        )

    def list_members(
        self,
        actor_id: str,
        organization_id: str,
        project_id: str | None = None,
    ) -> list[ScopeMemberSummary]:
        permissions = self.karag_manager.access_service.get_effective_permissions(
            actor_id,
            organization_id,
            project_id,
        )
        required_permission = "project.view" if project_id else "org.view"
        if required_permission not in permissions and "org.admin" not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        if project_id:
            memberships = self.karag_manager.memberships.list_project_memberships(organization_id, project_id)
        else:
            memberships = self.karag_manager.memberships.list_organization_memberships(organization_id)

        members_by_user: dict[str, ScopeMemberSummary] = {}
        for membership in memberships:
            role = self.karag_manager.roles.get_role_by_id(membership.role_id)
            role_name = role.name if role else "unknown"
            existing = members_by_user.get(membership.user_id)
            inherited = membership.project_id is None and project_id is not None
            if existing and inherited:
                continue
            user = self.repository.get_user_by_id(membership.user_id)
            display_name = (
                user.full_name
                if user and user.full_name
                else membership.user_id
            )
            email = user.email if user else membership.user_id
            members_by_user[membership.user_id] = ScopeMemberSummary(
                id=membership.id,
                user_id=membership.user_id,
                email=email,
                display_name=display_name,
                role=role_name,
                mfa_enabled=False,
                organization_id=membership.organization_id,
                project_id=membership.project_id,
                inherited=inherited,
                created_at=membership.created_at,
            )

        return sorted(
            members_by_user.values(),
            key=lambda member: (member.inherited, member.display_name.lower(), member.email.lower()),
        )

    def get_effective_permissions(
        self,
        actor_id: str,
        organization_id: str,
        project_id: str | None = None,
    ) -> EffectivePermissionsSummary:
        permissions = self.karag_manager.access_service.get_effective_permissions(
            actor_id,
            organization_id,
            project_id,
        )
        if not permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return EffectivePermissionsSummary(
            organization_id=organization_id,
            project_id=project_id,
            actor_id=actor_id,
            permissions=sorted(permissions),
        )

    def create_membership(
        self,
        actor_id: str,
        organization_id: str,
        user_id: str,
        role_name: str,
        project_id: str | None = None,
    ) -> ScopeMemberSummary:
        self._check_membership_manage_access(actor_id, organization_id, project_id)
        role = self.karag_manager.roles.get_role_by_name(role_name)
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role {role_name} not found")

        resolved_user_id = user_id
        if "@" in user_id:
            existing_user = self.repository.get_user_by_email(user_id)
            if existing_user:
                resolved_user_id = existing_user.id

        existing = self.karag_manager.memberships.find_membership(
            resolved_user_id,
            organization_id,
            project_id,
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Membership already exists.")

        membership = self.karag_manager.memberships.add_membership(
            user_id=resolved_user_id,
            organization_id=organization_id,
            project_id=project_id,
            role_id=role.id,
        )
        return self._to_scope_member_summary(membership, project_id=project_id)

    def update_membership(
        self,
        actor_id: str,
        organization_id: str,
        membership_id: str,
        role_name: str,
        project_id: str | None = None,
    ) -> ScopeMemberSummary:
        self._check_membership_manage_access(actor_id, organization_id, project_id)
        membership = self.karag_manager.memberships.get_membership(membership_id)
        if not membership or membership.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found.")
        if membership.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Membership scope does not match request.")

        role = self.karag_manager.roles.get_role_by_name(role_name)
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role {role_name} not found")

        updated = self.karag_manager.memberships.update_membership_role(membership_id, role.id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found.")
        return self._to_scope_member_summary(updated, project_id=project_id)

    def delete_membership(
        self,
        actor_id: str,
        organization_id: str,
        membership_id: str,
        project_id: str | None = None,
    ) -> None:
        self._check_membership_manage_access(actor_id, organization_id, project_id)
        membership = self.karag_manager.memberships.get_membership(membership_id)
        if not membership or membership.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found.")
        if membership.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Membership scope does not match request.")
        self.karag_manager.memberships.delete_membership(membership_id)
