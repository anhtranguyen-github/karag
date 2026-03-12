from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    organization_id: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UserSummary(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Permission(BaseModel):
    code: str
    description: str | None = None


class RoleSummary(BaseModel):
    id: str
    name: str
    description: str | None = None


class MembershipSummary(BaseModel):
    id: str
    user_id: str
    organization_id: str
    project_id: str | None = None
    role_id: str
    created_at: datetime


class MembershipCreateRequest(BaseModel):
    user_id: str
    role: str


class MembershipUpdateRequest(BaseModel):
    role: str


class ScopeMemberSummary(BaseModel):
    id: str
    user_id: str
    email: str
    display_name: str
    role: str
    mfa_enabled: bool = False
    organization_id: str
    project_id: str | None = None
    inherited: bool = False
    created_at: datetime


class EffectivePermissionsSummary(BaseModel):
    organization_id: str
    project_id: str | None = None
    actor_id: str
    permissions: list[str]
